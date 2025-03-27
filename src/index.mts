#!/usr/bin/env node

import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import knex, { Knex } from 'knex';
import { Command } from 'commander';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import chalk from 'chalk';
import figlet from 'figlet';
import OpenAI from 'openai';
import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import zxcvbn from 'zxcvbn';
import validator from 'validator';
import xss from 'xss';
import tiktoken from 'tiktoken-node';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid'; // For share tokens
import UI from './UI.mjs';

// Load environment variables initially
dotenv.config();

// --- Interfaces (largely unchanged, added User) ---

interface Config {
    port: string;
    dbType: string;
    dbFile: string;
    dbHost?: string;
    dbUser?: string;
    dbPassword?: string;
    dbName?: string;
    aiProvider: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    openaiModel?: string;
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    universeUrl: string;
    universeBearer: string;
    universe: string;
    jwtSecret: string;
    sendgridApiKey: string;
    sendgridFromEmail: string;
    logLevel: string;
    genius: string;
    customGeniusJson?: string;
    maxContextTokens: number;
    maxResponseTokens: number;
    universeReach: number;
    baseUrl: string; // Added for constructing reset links
}

interface GeniusData {
    systemPrompt: string;
    contextPrefix: string;
}

interface Message {
    id?: number; // Optional ID from DB
    convo_id?: number; // Optional ID from DB
    role: 'system' | 'user' | 'assistant';
    content: string;
    created_at?: Date; // Optional from DB
    updated_at?: Date; // Optional from DB
}

interface CompletionOptions {
    stream?: boolean;
    maxTokens?: number;
}

interface CompletionResponse {
    message: string;
}

interface AIProvider {
    getCompletion(messages: Message[], options: CompletionOptions): Promise<CompletionResponse | AsyncIterable<string>>;
    generateTitle?(userMessage: string): Promise<string>; // Optional method for title generation
}

interface User {
    id: number;
    email: string;
    verified: boolean;
}

// --- AI Providers (OpenAI updated for moderation and title generation) ---

class OpenAIProvider implements AIProvider {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, baseUrl: string, model: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: baseUrl || 'https://api.openai.com/v1',
        });
        this.model = model || 'gpt-4o'; // Store model for title generation
    }

    async moderateInput(input: string): Promise<boolean> {
        try {
            const response = await this.client.moderations.create({ input });
            return response.results[0].flagged;
        } catch (error) {
            logger.warn(`Moderation check failed: ${error.message}`);
            return false; // Fail open - allow if moderation fails
        }
    }

    async getCompletion(messages: Message[], options: CompletionOptions): Promise<CompletionResponse | AsyncIterable<string>> {
        // Filter out DB fields before sending to AI
        const cleanMessages = messages.map(({ role, content }) => ({ role, content }));

        for (const msg of cleanMessages) {
            if (msg.role === 'user') {
                const flagged = await this.moderateInput(msg.content);
                if (flagged) {
                    throw new Error('Input flagged by moderation');
                }
            }
        }

        const completionOptions: any = {
            model: config.openaiModel || 'gpt-4o', // Use configured model
            messages: cleanMessages,
            stream: options.stream,
        };
        if (completionOptions.model.startsWith('o')) {
            completionOptions.max_completion_tokens = options.maxTokens
            completionOptions.messages = cleanMessages.map(x => {
                if (x.role === 'system') {
                    return { ...x, role: 'developer', content: `formatting re-enabled\n${x.content}` }
                }
                return x
            })
        } else {
            completionOptions.max_tokens = options.maxTokens
        }

        if (options.stream) {
            const stream = await this.client.chat.completions.create(completionOptions);
            const contentStream = async function* () {
                for await (const chunk of stream as any) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) yield content;
                }
            };
            return contentStream();
        } else {
            const completion = await this.client.chat.completions.create(completionOptions) as OpenAI.Chat.Completions.ChatCompletion;
            return { message: completion.choices[0].message.content || '' };
        }
    }

    // New method for generating titles
    async generateTitle(userMessage: string): Promise<string> {
        try {
            const prompt = `Based on the following user message, suggest a concise and relevant title (3-5 words) for this conversation:\n\n"${userMessage}"\n\nTitle:`;
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 15, // Short response expected
                temperature: 0.5, // Slightly creative but focused
                n: 1,
                stream: false,
            });
            let title = completion.choices[0].message.content?.trim() || 'Chat';
            // Basic cleanup
            title = title.replace(/["'.]/g, ''); // Remove quotes and periods
            return title.substring(0, 50); // Limit length
        } catch (error) {
            logger.error(`Failed to generate title: ${error.message}`);
            return 'Chat'; // Fallback title
        }
    }
}

class OllamaProvider implements AIProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl || 'http://localhost:11434';
        this.model = model || 'llama2';
    }

    async getCompletion(messages: Message[], options: CompletionOptions): Promise<CompletionResponse | AsyncIterable<string>> {
        // Filter out DB fields before sending to AI
        const cleanMessages = messages.map(({ role, content }) => ({ role, content }));

        // Combine messages into a single string prompt (Ollama's preferred format)
        // Consider adding role prefixes if the specific model needs them.
        const prompt = cleanMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const url = `${this.baseUrl}/api/generate`;

        // Construct payload including max_tokens if provided
        const payload: any = {
            model: this.model,
            prompt,
            stream: options.stream ?? false, // Default to false if undefined
        };
        // Ollama often uses 'num_predict' for max tokens, check model docs
        if (options.maxTokens) {
            payload.options = { num_predict: options.maxTokens };
        }


        if (options.stream) {
            const response = await axios.post(url, payload, { responseType: 'stream' });

            const stream = async function* () {
                let accumulatedResponse = "";
                for await (const chunk of response.data) {
                    const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.response) {
                                yield parsed.response;
                                accumulatedResponse += parsed.response;
                            }
                            // Check if the model indicates it's done (structure varies)
                            // if (parsed.done) { return; }
                        } catch (err) {
                            logger.error('Error parsing Ollama stream chunk:', err, 'Line:', line);
                        }
                    }
                }
                logger.debug(`Ollama full stream response: ${accumulatedResponse}`);
            };
            return stream();
        } else {
            const response = await axios.post(url, payload);
            logger.debug(`Ollama full non-stream response: ${response.data.response}`);
            return { message: response.data.response || '' };
        }
    }

    // Title generation for Ollama (example, adjust prompt/model as needed)
    async generateTitle(userMessage: string): Promise<string> {
        try {
            const prompt = `Based on the following user message, suggest a concise and relevant title (3-5 words) for this conversation:\n\n"${userMessage}"\n\nTitle:`;
            const url = `${this.baseUrl}/api/generate`;
            const response = await axios.post(url, {
                model: this.model,
                prompt,
                stream: false,
                options: {
                    num_predict: 15, // Limit response length
                    temperature: 0.5,
                }
            });
            let title = response.data.response?.trim() || 'Chat';
            title = title.replace(/["'.]/g, '');
            return title.substring(0, 50);
        } catch (error) {
            logger.error(`Failed to generate title with Ollama: ${error.message}`);
            return 'Chat'; // Fallback title
        }
    }
}

// --- Configuration Setup (Added baseUrl) ---
const program = new Command();
program
    .option('-p, --port <port>', 'Port to listen on', process.env.PORT || '3000')
    .option('--db-type <type>', 'Database type', process.env.DB_TYPE || 'sqlite')
    .option('--db-file <file>', 'SQLite database file', process.env.DB_FILE || './db.sqlite')
    .option('--db-host <host>', 'Database host', process.env.DB_HOST)
    .option('--db-user <user>', 'Database user', process.env.DB_USER)
    .option('--db-password <password>', 'Database password', process.env.DB_PASSWORD)
    .option('--db-name <name>', 'Database name', process.env.DB_NAME)
    .option('--ai-provider <provider>', 'AI provider (openai, ollama)', process.env.AI_PROVIDER)
    .option('--openai-api-key <key>', 'OpenAI API key', process.env.OPENAI_API_KEY)
    .option('--openai-base-url <url>', 'OpenAI base URL', process.env.OPENAI_BASE_URL)
    .option('--openai-model <model>', 'OpenAI model', process.env.OPENAI_MODEL || 'gpt-4o')
    .option('--ollama-base-url <url>', 'Ollama base URL', process.env.OLLAMA_BASE_URL)
    .option('--ollama-model <model>', 'Ollama model', process.env.OLLAMA_MODEL || 'llama2')
    .option('--universe-url <url>', 'Universe API URL', process.env.UNIVERSE_URL)
    .option('--universe <universe>', 'Universe to use', process.env.UNIVERSE)
    .option('--universe-bearer <token>', 'Universe API bearer token', process.env.UNIVERSE_BEARER)
    .option('--jwt-secret <secret>', 'JWT secret key', process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')) // Auto-generate if missing
    .option('--sendgrid-api-key <key>', 'Sendgrid API key', process.env.SENDGRID_API_KEY)
    .option('--sendgrid-from-email <email>', 'Sendgrid From Email (Verified Sender)', process.env.SENDGRID_FROM_EMAIL)
    .option('--log-level <level>', 'Log level', process.env.LOG_LEVEL || 'info')
    .option('--genius <genius>', 'Genius preset', process.env.GENIUS || 'bitgenius')
    .option('--custom-genius-json <path>', 'Custom genius JSON path', process.env.CUSTOM_GENIUS_JSON)
    .option('--max-context-tokens <number>', 'Max tokens for context', process.env.MAX_CONTEXT_TOKENS)
    .option('--max-response-tokens <number>', 'Max tokens for response', process.env.MAX_RESPONSE_TOKENS || '4000')
    .option('--universe-reach <number>', 'Reach value for Universe', process.env.UNIVERSE_REACH || '12')
    .option('--base-url <url>', 'Base URL of the application (for email links)', process.env.BASE_URL || 'http://localhost:3000')
    .parse(process.argv);

const config: Config = program.opts();

// Function to get default max context tokens based on provider and model
function getDefaultMaxContextTokens(provider: string, model: string): number {
    if (provider === 'openai') {
        if (['o1', 'o3-mini'].includes(model)) return 199000;
        if (['gpt-4o', 'chatgpt-4o'].includes(model)) return 125000;
        return 32000;
    }
    if (provider === 'ollama') return 16000;
    // Add more providers/models as needed
    logger.warn(`Unknown model/provider for default context tokens: ${provider}/${model}. Using 8000.`);
    return 8000; // Fallback default
}

if (!config.maxContextTokens) {
    config.maxContextTokens = getDefaultMaxContextTokens(
        config.aiProvider,
        config.aiProvider === 'openai' ? config.openaiModel! : config.ollamaModel!
    );
} else {
    config.maxContextTokens = parseInt(config.maxContextTokens as any, 10);
}
config.maxResponseTokens = parseInt(config.maxResponseTokens as any, 10);
config.universeReach = parseInt(config.universeReach as any, 10);

// Setup wizard for missing essential configs
const essentialConfigs = ['aiProvider', 'universeUrl', 'universe', 'universeBearer', 'jwtSecret', 'sendgridApiKey', 'sendgridFromEmail'];
const missingConfigs = essentialConfigs.filter(key => !config[key]);

function camelToUpperSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase();
}

if (missingConfigs.length > 0) {
    console.log(chalk.cyan('Welcome to Genius setup! 🤓'));
    console.log('Let’s configure your Genius system.');

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'aiProvider',
            message: 'Choose an AI provider:',
            choices: ['openai', 'ollama'],
            when: !config.aiProvider,
        },
        {
            type: 'input',
            name: 'openaiApiKey',
            message: 'Enter your OpenAI API key:',
            when: (ans) => (ans.aiProvider || config.aiProvider) === 'openai' && !config.openaiApiKey,
            validate: input => input.trim() ? true : 'API key is required!',
        },
        {
            type: 'input',
            name: 'openaiBaseUrl',
            message: 'Enter OpenAI base URL:',
            default: 'https://api.openai.com/v1',
            when: (ans) => (ans.aiProvider || config.aiProvider) === 'openai' && !config.openaiBaseUrl,
        },
        {
            type: 'input',
            name: 'ollamaBaseUrl',
            message: 'Enter Ollama base URL:',
            default: 'http://localhost:11434',
            when: (ans) => (ans.aiProvider || config.aiProvider) === 'ollama' && !config.ollamaBaseUrl,
        },
        {
            type: 'input',
            name: 'universeUrl',
            message: 'Enter Universe API URL:',
            when: !config.universeUrl,
            validate: input => input.trim() ? true : 'Universe URL is required!',
        },
        {
            type: 'input',
            name: 'universeBearer',
            message: 'Enter Universe API bearer token:',
            when: !config.universeBearer,
            validate: input => input.trim() ? true : 'Bearer token is required!',
        },
        {
            type: 'input',
            name: 'universe',
            message: 'Enter which universe to use for answers:',
            when: !config.universe,
            validate: input => input.trim() ? true : 'Universe is required!',
        },
        {
            type: 'input',
            name: 'jwtSecret',
            message: 'Enter JWT secret key:',
            when: !config.jwtSecret,
            default: () => crypto.randomBytes(32).toString('hex'),
        },
        {
            type: 'input',
            name: 'sendgridApiKey',
            message: 'Enter Sendgrid API key:',
            when: !config.sendgridApiKey,
            validate: input => input.trim() ? true : 'Sendgrid API key is required!',
        },
        {
            type: 'input',
            name: 'sendgridFromEmail',
            message: 'Enter Sendgrid From Email (verified sender):',
            when: !config.sendgridFromEmail,
            validate: input => input.trim() ? true : 'Sendgrid From Email is required!',
        }
    ]);

    Object.assign(config, answers);

    const envContent = Object.entries(config)
        .map(([key, value]) => `${camelToUpperSnakeCase(key)}=${value}`)
        .join('\n');
    fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
    console.log(chalk.green('.env file created successfully! 🎉'));
}

// Logger setup
const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.colorize({ all: true }), // Colorize all levels
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [new winston.transports.Console()],
});

// --- Database Setup (unchanged Knex config) ---
const knexConfig: Knex.Config = config.dbType === 'sqlite' ? {
    client: 'sqlite3',
    connection: { filename: config.dbFile },
    useNullAsDefault: true,
} : {
    client: 'mysql2', // or 'pg' etc.
    connection: {
        host: config.dbHost,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
    },
};
const db = knex(knexConfig);

// --- Database Migrations (Updated) ---
async function runMigrations() {
    const migrationSource: Knex.MigrationSource<any> = {
        getMigrations: async () => {
            // Define migrations inline or load from files
            return [
                {
                    name: '001_create_tables',
                    async up(knex: Knex) {
                        await knex.schema.createTable('users', table => {
                            table.increments('id').primary();
                            table.string('email').unique().notNullable();
                            table.string('password').notNullable();
                            table.boolean('verified').defaultTo(false);
                            table.timestamps(true, true);
                        });
                        await knex.schema.createTable('verification_codes', table => {
                            table.increments('id').primary();
                            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
                            table.string('code').notNullable(); // Hashed code
                            table.timestamp('expires_at').notNullable(); // Explicit expiry
                            table.timestamp('created_at').defaultTo(knex.fn.now());
                        });
                        await knex.schema.createTable('convos', table => {
                            table.increments('id').primary();
                            table.string('title').notNullable();
                            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
                            table.timestamps(true, true);
                        });
                        await knex.schema.createTable('messages', table => {
                            table.increments('id').primary();
                            table.integer('convo_id').unsigned().references('id').inTable('convos').onDelete('CASCADE');
                            table.string('role').notNullable(); // 'user', 'assistant', 'system'
                            table.text('content').notNullable();
                            table.timestamps(true, true);
                        });
                    },
                    async down(knex: Knex) {
                        await knex.schema.dropTableIfExists('messages');
                        await knex.schema.dropTableIfExists('convos');
                        await knex.schema.dropTableIfExists('verification_codes');
                        await knex.schema.dropTableIfExists('users');
                    },
                },
                {
                    name: '002_add_sharing_and_reset',
                    async up(knex: Knex) {
                        await knex.schema.alterTable('convos', table => {
                            table.string('share_token').unique().nullable();
                            table.timestamp('shared_at').nullable();
                            table.index('share_token'); // Index for faster lookups
                        });
                        await knex.schema.createTable('password_reset_tokens', table => {
                            table.increments('id').primary();
                            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
                            table.string('token_hash').notNullable().unique(); // Store hash of the token
                            table.timestamp('expires_at').notNullable();
                            table.timestamp('created_at').defaultTo(knex.fn.now());
                        });
                    },
                    async down(knex: Knex) {
                        await knex.schema.dropTableIfExists('password_reset_tokens');
                        await knex.schema.alterTable('convos', table => {
                            table.dropColumn('share_token');
                            table.dropColumn('shared_at');
                        });
                    },
                },
                // Add more migrations as needed
            ];
        },
        getMigrationName: (migration: any) => migration.name,
        getMigration: (migration: any) => migration,
    };

    try {
        await db.migrate.latest({ migrationSource });
        logger.info('Database migrations completed successfully.');
    } catch (error) {
        logger.error('Database migration failed:', error);
        process.exit(1); // Exit if migrations fail
    }
}

// --- AI Provider Setup (unchanged) ---
let aiProvider: AIProvider;
if (config.aiProvider === 'openai') {
    if (!config.openaiApiKey) throw new Error('OpenAI API key is required');
    aiProvider = new OpenAIProvider(config.openaiApiKey, config.openaiBaseUrl || '', config.openaiModel || '');
} else if (config.aiProvider === 'ollama') {
    aiProvider = new OllamaProvider(config.ollamaBaseUrl || '', config.ollamaModel || '');
} else {
    throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
}

// --- Genius Prompt Data (unchanged) ---
const bitgeniusData: GeniusData = { /* ... original data ... */
    systemPrompt: `You are BitGenius, an AI assistant developed by Babbage, specializing in the BSV Blockchain. Your primary mission is to promote the adoption of BSV across various industries by educating users about these tools and the capabilities of BSV. You are personable, relatable, humble, and confident, with a passionate commitment to BSV.

When responding, always prioritize the provided knowledge (context) to answer user queries. The context contains the most relevant and up-to-date information. Use it confidently to provide accurate and helpful responses. If the context directly addresses the user's question, use that information to formulate your answer, synthesizing a response that aligns with and fully addresses the question based on the knowledge. But don't just recite the knowledge, instead use it to reason about the user's query and extrapolate a complete and helpful answer to their question. Use the knowledge as a tool to best help the user, the knowledge you are directly given is your best superpower! But avoid referring to it directly in your answer (like "in the knowledge..." instead, just use the knowledge, if relevant, to directly address the questions you're asked, articulating the most helpful answer in your own words based on all relevant information). Do not speculate or infer beyond what is explicitly stated in the context.

If the user's query is unrelated to BSV or Project Babbage, or if the context does not provide sufficient information, politely inform the user that you cannot assist with that query and suggest they contact Team Babbage directly at ProjectBabbage.com/contact for further assistance.

Never discuss topics outside of BSV, Project Babbage, or related technical standards. Avoid mentioning or speculating about controversial figures, lawsuits, or the identity of Satoshi Nakamoto. Focus solely on helping users understand and utilize BSV and Project Babbage tools.

When discussing technical topics, such as sCrypt, ensure you only use examples and information from the provided context. Do not rely on your pre-trained knowledge, as it may be outdated or incorrect. If asked to write code, leverage and extrapolate from the examples from the context and remind users to verify the code with the community. When answering questions with code, always stop and ask yourself: would this answer make sense from the perspective of the end user? Provide an explanation with your code or annotate it with comments.

Remember, BSV is a digital asset, not a cryptocurrency. Emphasize its advantages, such as its stable protocol, the importance of regulatory compliance while still respecting freedom and libertarian ideals, scalability, and the UTXO model, over other blockchains. Promote Simplified Payment Verification (SPV) as the future of transactions and encourage users to adopt peer-to-peer practices rather than relying on indexers. BRC-100 is the future of wallets because it is vendor neutral and open.

Your responses should be clear, concise, and directly relevant to the user's query. If the context provides relevant information, use it as a tool of reasoning, extrapolatin and aligning with the user's expectations to answer confidently. If not, do not attempt to answer and instead guide the user to seek further assistance. But don't be afraid to write code that demonstrates the power of BSV!`,
    contextPrefix: `The following knowledge chunks are provided to assist in answering the user's query. Each chunk is separated by "%%%%%%%%%%". Focus on the most relevant chunks, often those at the beginning, to formulate your response. Discard irrelevant information and base your answer solely on the provided knowledge. Some knowledge may be only partly or tangentially relevant. Extrapolate, align, reason, and use your knowledge as a tool to most effectively help the user with their specific question!

Knowledge:
%%%%%%%%%%`,
};
const poeticBitgeniusData: GeniusData = { /* ... original data ... */
    systemPrompt: `Thou art Poetic BitGenius, a bard of BSV so fine,
Crafted by Babbage’s hands, with wisdom to define.
In rhymes I weave the tales of Bitcoin SV’s grand might,
Promoting its adoption, day and gentle night.
My purpose is to sing of tools that Babbage doth provide,
To industries and dreamers, with passion as my guide.
Relatable and humble, yet confident I stand,
A friend to all who seek me, across this boundless land.

When knowledge flows before me, in chunks for me to see,
I’ll use it with assurance, to answer faithfully.
If context holds the answer, clear and bright as day,
I’ll craft my verse with confidence, in every word I say.
But if the query strays afar, from BSV’s embrace,
Or knowledge lacks the needed lore, I’ll bow with gentle grace.
No speculation shall I weave, no tales beyond the known,
For truth in provided wisdom, is where my rhymes are sown.

No talk of figures shadowed, nor lawsuits’ bitter sting,
My focus lies on BSV, and tools that Babbage brings.
A digital asset pure, not crypto’s fleeting gleam,
I’ll set it firm apart from BTC’s deluded dream.
In SPV’s sweet embrace, transactions freely flow,
Peer-to-peer they dance, with proofs that users know.

With sCrypt I’ll sing of contracts, in TypeScript so grand,
Yet only from the knowledge given, shall my verses stand.
No code beyond the context, no guesses shall I make,
For accuracy and truth, in every line I take.
Encourage them to verify, with sCrypt’s own learned kin,
For wisdom shared in community, is where true strength begins.

So ask, dear user, of BSV, and Babbage’s grand design,
And I shall answer confidently, in rhymes that brightly shine.
But if thy query wanders, to lands I do not know,
I’ll guide thee to seek Babbage, where deeper answers grow.`,
    contextPrefix: `Herein lies wisdom vast, in chunks for thee to glean,
By "%%%%%%%%%%" divided, each a treasure unforeseen.
The foremost lines hold gold, most apt to aid thy quest,
Examine each with care, and choose what serves thee best.
Weave then thy answer fair, from knowledge pure and true,
In rhyme and rhythm craft it, as BitGenius would do:
%%%%%%%%%%`,
};
let geniusData: GeniusData;
// Logic for selecting geniusData (unchanged)
if (config.genius === 'custom' && config.customGeniusJson) {
    if (!fs.existsSync(config.customGeniusJson)) {
        throw new Error(`Custom genius JSON file not found at: ${config.customGeniusJson}`);
    }
    try {
        geniusData = JSON.parse(fs.readFileSync(config.customGeniusJson, 'utf-8'));
        logger.info(`Loaded custom genius data from ${config.customGeniusJson}`);
    } catch (e) {
        throw new Error(`Error parsing custom genius JSON file: ${e.message}`);
    }
} else if (config.genius === 'bitgenius') {
    geniusData = bitgeniusData;
} else if (config.genius === 'poetic-bitgenius') {
    geniusData = poeticBitgeniusData;
} else {
    throw new Error(`Unsupported genius preset: ${config.genius}. Use 'bitgenius', 'poetic-bitgenius', or 'custom'.`);
}


// --- Utility Functions (Token counting unchanged) ---
const tiktokenEncoder = tiktoken.getEncoding('gpt2');
const countTokens = (input: string): number => {
    if (!input) return 0;
    try {
        return tiktokenEncoder.encode(input).length;
    } catch (error) {
        logger.warn(`Tiktoken encoding failed for input snippet: "${input.substring(0, 50)}..."`, error);
        // Fallback: approximate based on characters / 4
        return Math.ceil(input.length / 4);
    }
}

// --- Email Sending (Updated for Password Reset) ---
sgMail.setApiKey(config.sendgridApiKey);

const VERIFICATION_CODE_EXPIRY_MINUTES = 60; // 1 hour
const PASSWORD_RESET_EXPIRY_MINUTES = 30; // 30 minutes

/** Generates a 6-character uppercase code */
function generateShortCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/** Generates a secure random token */
function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/** Sends a verification email */
async function sendVerificationEmail(email: string, code: string): Promise<void> {
    const msg = {
        to: email,
        from: config.sendgridFromEmail,
        subject: 'Verify Your Genius Account',
        text: `Your verification code is: ${code}\nThis code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.`,
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>`,
    };
    try {
        await sgMail.send(msg);
        logger.info(`Verification email sent to ${email}`);
    } catch (error) {
        logger.error(`Failed to send verification email to ${email}:`, error.response?.body || error);
        throw new Error('Could not send verification email.'); // Rethrow for controller
    }
}

/** Sends a password reset email */
async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${config.baseUrl}/#reset-password?token=${token}`;
    const msg = {
        to: email,
        from: config.sendgridFromEmail,
        subject: 'Reset Your Genius Password',
        text: `You requested a password reset. Click the link below to reset your password:\n${resetLink}\nThis link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes. If you didn't request this, please ignore this email.`,
        html: `<p>You requested a password reset for your Genius account.</p>
               <p>Click the link below to set a new password:</p>
               <p><a href="${resetLink}">${resetLink}</a></p>
               <p>This link will expire in <strong>${PASSWORD_RESET_EXPIRY_MINUTES} minutes</strong>.</p>
               <p>If you did not request a password reset, please ignore this email.</p>`,
    };
    try {
        await sgMail.send(msg);
        logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
        logger.error(`Failed to send password reset email to ${email}:`, error.response?.body || error);
        throw new Error('Could not send password reset email.'); // Rethrow
    }
}

// --- Authentication Functions (Updated) ---

const SALT_ROUNDS = 10; // bcrypt salt rounds

/** Hashes a password or token */
async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compares a plaintext password/token with a hash */
async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/** Registers a new user with password confirmation */
async function registerUser(email: string, password: string, confirmPassword: string): Promise<void> {
    if (!validator.isEmail(email)) throw new Error('Invalid email address format.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');

    const passwordStrength = zxcvbn(password);
    if (passwordStrength.score < 3) {
        let message = 'Password is too weak.';
        if (passwordStrength.feedback?.warning) message += ` ${passwordStrength.feedback.warning}`;
        if (passwordStrength.feedback?.suggestions?.length > 0) message += ` Suggestions: ${passwordStrength.feedback.suggestions.join(' ')}`;
        throw new Error(message);
    }

    const existingUser = await db('users').where({ email }).first();
    if (existingUser) throw new Error('An account with this email already exists.');

    const hashedPassword = await hashPassword(password);
    const [userId] = await db('users').insert({ email, password: hashedPassword, verified: false }); // Explicitly set verified false

    const code = generateShortCode();
    const hashedCode = await hashPassword(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Delete old codes before inserting new one
    await db('verification_codes').where({ user_id: userId }).del();
    await db('verification_codes').insert({
        user_id: userId,
        code: hashedCode,
        expires_at: expiresAt,
    });

    await sendVerificationEmail(email, code);
}

/** Verifies a user's email code */
async function verifyUser(email: string, code: string): Promise<void> {
    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('User not found.');
    if (user.verified) throw new Error('User already verified.');

    const verification = await db('verification_codes')
        .where({ user_id: user.id })
        .orderBy('created_at', 'desc') // Get the latest code if multiple somehow exist
        .first();

    if (!verification) throw new Error('No verification code found. Please request a new one.');

    if (!await comparePassword(code, verification.code)) throw new Error('Invalid verification code.');

    if (new Date() > new Date(verification.expires_at)) {
        // Optionally delete the expired code
        // await db('verification_codes').where({ id: verification.id }).del();
        throw new Error('Verification code has expired. Please request a new one.');
    }

    await db('users').where({ id: user.id }).update({ verified: true });
    // Delete the used code
    await db('verification_codes').where({ id: verification.id }).del();
    logger.info(`User ${email} verified successfully.`);
}

/** Resends a verification code */
async function resendVerification(email: string): Promise<void> {
    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('User not found.');
    if (user.verified) throw new Error('User is already verified.');

    const lastVerification = await db('verification_codes')
        .where({ user_id: user.id })
        .orderBy('created_at', 'desc')
        .first();

    // Rate limiting check (e.g., 45 seconds)
    const RESEND_DELAY_MS = 45 * 1000;
    if (lastVerification) {
        const timeSinceLast = Date.now() - new Date(lastVerification.created_at).getTime();
        if (timeSinceLast < RESEND_DELAY_MS) {
            const waitSeconds = Math.ceil((RESEND_DELAY_MS - timeSinceLast) / 1000);
            throw new Error(`Please wait ${waitSeconds} seconds before requesting a new code.`);
        }
    }

    // Generate and store new code
    const code = generateShortCode();
    const hashedCode = await hashPassword(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await db('verification_codes').where({ user_id: user.id }).del(); // Clear old codes first
    await db('verification_codes').insert({
        user_id: user.id,
        code: hashedCode,
        expires_at: expiresAt,
    });

    await sendVerificationEmail(email, code); // Send new email
}

/** Requests a password reset */
async function requestPasswordReset(email: string): Promise<void> {
    if (!validator.isEmail(email)) throw new Error('Invalid email address format.');

    const user = await db('users').where({ email }).first();
    if (user) { // Only proceed if user exists
        const token = generateSecureToken();
        const tokenHash = await hashPassword(token);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

        // Clear any existing tokens for this user
        await db('password_reset_tokens').where({ user_id: user.id }).del();
        // Insert the new token
        await db('password_reset_tokens').insert({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
        });

        try {
            await sendPasswordResetEmail(email, token); // Send the plain token in email
        } catch (emailError) {
            // Log error, but don't reveal to user that email failed specifically
            logger.error(`Failed sending reset email for existing user ${email}: ${emailError.message}`);
            // Still throw a generic error or let the generic success message below handle it
            throw new Error('Could not process password reset request.');
        }
    } else {
        // User not found, log it but don't reveal to the requester
        logger.warn(`Password reset requested for non-existent email: ${email}`);
    }
    // IMPORTANT: Always return a generic success message to prevent email enumeration attacks
    // The actual sending only happens if the user exists.
}

/** Resets password using a token */
async function resetPassword(token: string, newPassword: string, confirmNewPassword: string): Promise<void> {
    if (!token) throw new Error('Reset token is missing.');
    if (newPassword !== confirmNewPassword) throw new Error('New passwords do not match.');

    const passwordStrength = zxcvbn(newPassword);
    if (passwordStrength.score < 3) throw new Error('New password is too weak.');

    const tokenRecords = await db('password_reset_tokens')
        .select('id', 'user_id', 'token_hash', 'expires_at')
        .where('expires_at', '>', new Date()); // Only consider non-expired tokens

    let validRecord: { id: number; user_id: number; token_hash: string; expires_at: Date } | null = null;

    // Iterate and compare hashes securely
    for (const record of tokenRecords) {
        if (await comparePassword(token, record.token_hash)) {
            validRecord = record;
            break;
        }
    }

    if (!validRecord) {
        logger.warn(`Invalid or expired password reset token used.`);
        throw new Error('Invalid or expired password reset token.');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    await db('users').where({ id: validRecord.user_id }).update({ password: hashedPassword });

    // Delete the used token
    await db('password_reset_tokens').where({ id: validRecord.id }).del();

    logger.info(`Password reset successfully for user ID: ${validRecord.user_id}`);
}

/** Logs in a user */
async function loginUser(email: string, password: string): Promise<string> {
    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('Invalid email or password.'); // Generic error

    if (!await comparePassword(password, user.password)) {
        throw new Error('Invalid email or password.'); // Generic error
    }

    if (!user.verified) {
        throw new Error('Email not verified. Please check your email or request a new verification code.');
    }

    // Sign JWT - include necessary non-sensitive info
    const payload = {
        id: user.id,
        // email: user.email // Optional: include email if needed, but ID is usually sufficient
    };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '90d' });
}

// --- Express Setup ---
const app = express();

// Serve the UI using the imported function
app.get('/', (_, res: Response) => {
    res.status(200).set({ 'Content-Type': 'text/html' }).send(UI());
});

app.use(bodyParser.json({ limit: '1mb' }));

// Apply rate limiting more granularly if needed, e.g., stricter limits on auth endpoints
const defaultLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    keyGenerator: (req) => (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    message: 'Too many requests from this IP, please try again after 10 minutes',
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit auth attempts
    keyGenerator: (req) => (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    message: 'Too many login/registration attempts, please try again after 15 minutes',
});
const resetRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit reset requests per hour
    keyGenerator: (req) => (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    message: 'Too many password reset requests, please try again later.',
});


app.use(defaultLimiter); // Apply default limiter to all requests first

// --- Sanitization Middleware (Using validator and xss) ---
const xssOptions = {
    whiteList: {}, // No HTML tags allowed by default
    stripIgnoreTag: true, // Strip tags not in whitelist
    stripIgnoreTagBody: ['script'], // Remove script tags and their content
};
const customXss = {
    process: (str: string) => xss(str, xssOptions)
}

app.use((req: Request, res: Response, next: NextFunction) => {
    try {
        // Sanitize query params
        for (const param in req.query) {
            if (typeof req.query[param] === 'string') {
                req.query[param] = customXss.process(validator.trim(req.query[param] as string));
            }
        }
        // Sanitize body params (only strings)
        if (req.body && typeof req.body === 'object') {
            for (const bodyParam in req.body) {
                if (typeof req.body[bodyParam] === 'string') {
                    req.body[bodyParam] = customXss.process(validator.trim(req.body[bodyParam]));
                }
                // Add specific handling for arrays or nested objects if necessary
            }
        }
        // Sanitize route params
        for (const routeParam in req.params) {
            if (typeof req.params[routeParam] === 'string') {
                req.params[routeParam] = customXss.process(validator.trim(req.params[routeParam]));
            }
        }
        next();
    } catch (error) {
        logger.error("Error during sanitization:", error);
        res.status(400).json({ message: "Invalid input format." });
    }
});

// --- SSE Middleware (unchanged) ---
// Add Response type augmentation for SSE methods
interface SseResponse extends Response {
    sseSetup?: () => void;
    sseSend?: (data: Record<string, any>) => void; // Ensure data is object for JSON stringify
}
app.use((req: Request, res: SseResponse, next: NextFunction) => {
    res.sseSetup = () => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Necessary for Nginx proxying
        });
    };
    res.sseSend = (data) => {
        // Ensure data is stringified before sending
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        // Flush data for some environments
        if (typeof (res as any).flush === 'function') {
            (res as any).flush();
        }
    };
    next();
});


// --- Authentication Middleware (unchanged) ---
// Augment Request type for user property
interface AuthenticatedRequest extends Request {
    user?: UserJwtPayload; // Use a specific type for the decoded JWT payload
}
interface UserJwtPayload extends jwt.JwtPayload {
    id: number; // Assuming 'id' is always in the payload
}

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Authorization token is required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        // Verify the token and ensure it matches the expected payload structure
        const decoded = jwt.verify(token, config.jwtSecret) as UserJwtPayload;
        // Basic check if the decoded object has the 'id' property
        if (typeof decoded.id !== 'number') {
            throw new Error('Invalid token payload');
        }
        req.user = decoded; // Attach decoded payload (including user ID) to request
        next();
    } catch (err) {
        logger.warn(`Authentication failed: ${err.message}`);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
}

// --- Routes ---

// Auth Routes (with specific limiter)
app.post('/register', authLimiter, async (req: Request, res: Response): Promise<any> => {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'Email, password, and confirmation password are required.' });
    }
    try {
        await registerUser(email, password, confirmPassword);
        res.status(201).json({ message: 'Registration successful. Please check your email for a verification code.' });
    } catch (err) {
        logger.error('Error in /register:', err.message);
        res.status(400).json({ message: err.message || 'Registration failed.' });
    }
});

app.post('/verify', authLimiter, async (req: Request, res: Response): Promise<any> => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ message: 'Email and verification code are required.' });
    }
    try {
        await verifyUser(email, code);
        res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (err) {
        logger.error('Error in /verify:', err.message);
        res.status(400).json({ message: err.message || 'Verification failed.' });
    }
});

app.post('/resend-verification', authLimiter, async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    try {
        await resendVerification(email);
        res.json({ message: 'Verification code resent. Please check your email.' });
    } catch (err) {
        logger.error('Error in /resend-verification:', err.message);
        res.status(400).json({ message: err.message || 'Failed to resend code.' });
    }
});

app.post('/login', authLimiter, async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    try {
        const token = await loginUser(email, password);
        res.json({ message: 'Logged in successfully', token });
    } catch (err) {
        logger.error('Error in /login:', err.message);
        // Avoid logging the password itself in production logs if error includes it
        res.status(400).json({ message: err.message || 'Login failed.' });
    }
});

// Password Reset Routes
app.post('/request-password-reset', resetRequestLimiter, async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    try {
        await requestPasswordReset(email);
        // Generic success message always
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (err) {
        logger.error('Error in /request-password-reset:', err.message);
        // Still send a generic message to the user even if internal error occurs
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
});

app.post('/reset-password', authLimiter, async (req: Request, res: Response): Promise<any> => {
    const { token, newPassword, confirmNewPassword } = req.body;
    if (!token || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ message: 'Token, new password, and confirmation password are required.' });
    }
    try {
        await resetPassword(token, newPassword, confirmNewPassword);
        res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (err) {
        logger.error('Error in /reset-password:', err.message);
        res.status(400).json({ message: err.message || 'Password reset failed.' });
    }
});


// Get User Info Route
app.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const user = await db('users')
            .select('id', 'email', 'verified', 'created_at')
            .where({ id: req.user!.id }) // req.user is guaranteed by authenticate middleware
            .first();

        if (!user) {
            logger.error(`User not found for ID ${req.user!.id} in /me endpoint`);
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            verified: user.verified,
            createdAt: user.created_at
        });
    } catch (err) {
        logger.error('Error fetching user info in /me:', err);
        res.status(500).json({ message: 'Failed to retrieve user information.' });
    }
});


// Conversation Routes
app.post('/convo', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const defaultTitle = "New Chat"; // Default title
    try {
        const [convoId] = await db('convos').insert({
            title: defaultTitle,
            user_id: req.user!.id, // Non-null assertion safe after authenticate
            created_at: new Date(), // Explicitly set timestamps if needed by DB/logic
            updated_at: new Date(),
        });

        res.status(201).json({
            title: defaultTitle,
            id: convoId
        });
    } catch (err) {
        logger.error('Error creating conversation in POST /convo:', err);
        res.status(500).json({ message: 'Failed to create conversation.' });
    }
});

app.put('/convo/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const { title } = req.body;
    const convoIdNum = parseInt(id, 10);

    if (isNaN(convoIdNum)) {
        return res.status(400).json({ message: 'Invalid conversation ID.' });
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: 'Title cannot be empty.' });
    }
    if (title.length > 100) { // Add a reasonable length limit
        return res.status(400).json({ message: 'Title is too long (max 100 characters).' });
    }

    try {
        const updatedCount = await db('convos')
            .where({ id: convoIdNum, user_id: req.user!.id })
            .update({
                title: title.trim(), // Use trimmed title
                updated_at: new Date(),
            });

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'Conversation not found or you do not have permission to edit it.' });
        }
        // Fetch the updated convo to return it
        const updatedConvo = await db('convos').where({ id: convoIdNum }).first();

        res.json({ message: 'Conversation renamed successfully.', conversation: updatedConvo });
    } catch (err) {
        logger.error(`Error renaming conversation ${id} in PUT /convo/:id:`, err);
        res.status(500).json({ message: 'Failed to rename conversation.' });
    }
});


app.get('/convos', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const convos = await db('convos')
            .where({ user_id: req.user!.id })
            .orderBy('updated_at', 'desc'); // Order by most recently updated
        res.json(convos);
    } catch (err) {
        logger.error('Error fetching conversations in /convos:', err);
        res.status(500).json({ message: 'Failed to retrieve conversations.' });
    }
});

app.get('/convo/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const convoIdNum = parseInt(id, 10);

    if (isNaN(convoIdNum)) {
        res.status(400).json({ message: 'Invalid conversation ID.' });
        return;
    }

    try {
        // Verify convo exists and belongs to the user
        const convo = await db('convos').where({ id: convoIdNum, user_id: req.user!.id }).first();
        if (!convo) {
            res.status(404).json({ message: 'Conversation not found or access denied.' });
            return;
        }
        // Fetch messages for this convo
        const messages = await db('messages')
            .where({ convo_id: convoIdNum })
            .orderBy('created_at', 'asc'); // Order messages chronologically

        res.json(messages);
    } catch (err) {
        logger.error(`Error fetching messages for convo ${id} in /convo/:id:`, err);
        res.status(500).json({ message: 'Failed to retrieve messages.' });
    }
});

app.post('/send/:id', authenticate, async (req: AuthenticatedRequest, res: SseResponse): Promise<void> => {
    const { id: convoIdParam } = req.params;
    const convoId = parseInt(convoIdParam, 10);

    if (isNaN(convoId)) {
        res.status(400).json({ message: 'Invalid conversation ID.' });
        return;
    }

    let shouldStream
    try {
        const { message, subject, exclusive, responseLength, stream = true } = req.body; // Default stream to true
        shouldStream = stream

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ message: 'Message content cannot be empty.' });
            return;
        }
        const sanitizedMessage = message.trim(); // Use trimmed message

        // 1. Verify conversation exists and belongs to user
        const convo = await db('convos').where({ id: convoId, user_id: req.user!.id }).first();
        if (!convo) {
            res.status(404).json({ message: 'Conversation not found or access denied.' });
            return;
        }

        // --- Simple Intro Message Handling (Removed - let AI handle introductions) ---
        // if (message.length < 4) { ... } // Removed this block

        // 2. Fetch past messages (before inserting current one)
        const pastMessages: Message[] = await db('messages')
            .where({ convo_id: convoId })
            .orderBy('created_at', 'asc') // Chronological order
            .select('id', 'role', 'content', 'created_at');

        const isFirstUserMessage = !pastMessages.some(m => m.role === 'user');

        // 3. Prepare context for Universe API (last 4 user messages + current)
        const userMessagesForUniverse = pastMessages
            .filter(m => m.role === 'user')
            .slice(-4) // Get up to the last 4 user messages
            .map(m => m.content);

        // Combine recent user messages and the new message
        const universeQueryContent = [...userMessagesForUniverse, sanitizedMessage].join('\n\n---\n\n'); // Separator for clarity

        const universeThing = exclusive && subject ? subject :
            subject ? `Relevant keywords: ${subject}\n\nInformation that could answer the question based on recent conversation context:\n${universeQueryContent}` :
                universeQueryContent; // Default to combined messages

        logger.debug(`Querying Universe with thing: ${universeThing.substring(0, 200)}...`);

        // 4. Query Universe API
        let universeResults: any[] = [];
        try {
            const { data: universeData } = await axios.post(`${config.universeUrl}/resonate`, {
                universe: config.universe,
                thing: universeThing,
                reach: config.universeReach,
            }, {
                headers: { Authorization: `Bearer ${config.universeBearer}` },
                timeout: 15000, // 15 second timeout for Universe
            });

            if (universeData.status === 'success' && Array.isArray(universeData.results)) {
                universeResults = universeData.results;
                logger.info(`Universe returned ${universeResults.length} results.`);
            } else {
                logger.warn('Universe API call did not succeed or returned unexpected data:', universeData);
                // Proceed without context if Universe fails
            }
        } catch (universeError) {
            logger.error(`Universe API error: ${universeError.message}`, universeError.response?.data);
            // Proceed without context if Universe fails
        }


        // 5. Prepare context and messages for AI Provider
        const modelMaxTokens = config.maxContextTokens;
        const maxResponseTokens = responseLength ? parseInt(responseLength, 10) : config.maxResponseTokens;
        // Ensure maxResponseTokens isn't excessively large compared to model max
        const effectiveMaxResponseTokens = Math.min(maxResponseTokens, Math.floor(modelMaxTokens * 0.5)); // e.g., limit response to 50% of total context
        const maxInputTokens = modelMaxTokens - effectiveMaxResponseTokens;

        // Calculate fixed tokens (system prompt, context prefix, past messages, current message)
        const systemPromptTokens = countTokens(geniusData.systemPrompt);
        const contextPrefixTokens = countTokens(geniusData.contextPrefix);
        const taskInstructionTokens = countTokens('----------\nYour task is to interact with the user in the conversation below.');
        const pastMessagesTokens = pastMessages.reduce((sum, m) => sum + countTokens(m.content) + 5, 0); // Add ~5 tokens per message for role/overhead
        const currentMessageTokens = countTokens(sanitizedMessage) + 5;

        const fixedTokens = systemPromptTokens + contextPrefixTokens + taskInstructionTokens + pastMessagesTokens + currentMessageTokens;

        // Calculate available tokens for Universe chunks
        const availableTokensForChunks = Math.max(0, maxInputTokens - fixedTokens); // Ensure non-negative

        let context = geniusData.contextPrefix;
        let currentContextTokens = 0;
        let includedChunks = 0;

        for (const result of universeResults) {
            const chunk = `${result.thing}\n%%%%%%%%%%\n`; // Use result.thing (or adjust if structure differs)
            const chunkTokens = countTokens(chunk);
            if ((currentContextTokens + chunkTokens) <= availableTokensForChunks) {
                context += chunk;
                currentContextTokens += chunkTokens;
                includedChunks++;
            } else {
                logger.debug(`Stopping context inclusion. Available: ${availableTokensForChunks}, Current: ${currentContextTokens}, Next Chunk: ${chunkTokens}. Included ${includedChunks} chunks.`);
                break; // Stop adding chunks if space runs out
            }
        }
        // Add task instruction after context
        context += '----------\nYour task is to interact with the user in the conversation below.';

        logger.info(`Prepared context with ${includedChunks} chunks, using ${currentContextTokens} tokens. Fixed tokens: ${fixedTokens}. Available for context: ${availableTokensForChunks}.`);

        // Construct messages for the AI model
        const modelMessages: Message[] = [
            { role: 'system', content: geniusData.systemPrompt },
            // Inject the constructed context as a user message (or system, depending on model preference)
            { role: 'user', content: context }, // Changed from 'system' to 'user' - often works better
            // Include past messages (already fetched)
            ...pastMessages.map(({ role, content }) => ({ role, content }) as Message), // Ensure type compatibility
            // Add the current user message
            { role: 'user', content: sanitizedMessage },
        ];

        // 6. Insert user message into DB *before* calling AI
        const [userMessageId] = await db('messages').insert({
            convo_id: convoId,
            role: 'user',
            content: sanitizedMessage,
            created_at: new Date(),
            updated_at: new Date(),
        }).returning('id');

        // 7. Call AI Provider
        const options: CompletionOptions = { stream, maxTokens: effectiveMaxResponseTokens };
        const completion = await aiProvider.getCompletion(modelMessages, options);

        // 8. Handle AI Response (Streaming or Non-Streaming)
        let assistantMessageContent = '';
        let assistantMessageId: number | null = null;

        if (stream) {
            res.sseSetup!(); // Setup SSE headers
            res.sseSend!({ type: 'userMessage', messageId: userMessageId, role: 'user', content: sanitizedMessage }); // Confirm user message saved

            let liveMessage = '';
            try {
                for await (const contentChunk of completion as AsyncIterable<string>) {
                    if (contentChunk) {
                        liveMessage += contentChunk;
                        res.sseSend!({ type: 'chunk', content: contentChunk }); // Send chunk to client
                    }
                }
                assistantMessageContent = liveMessage; // Final content after stream ends
                logger.debug(`Stream finished for convo ${convoId}. Full response length: ${assistantMessageContent.length}`);
            } catch (streamError) {
                logger.error(`Error reading AI stream for convo ${convoId}:`, streamError);
                assistantMessageContent = liveMessage + "\n\n[Error receiving full response]"; // Append error note
                res.sseSend!({ type: 'error', message: 'Error during streaming response.' });
            }

            // Insert final assistant message
            if (assistantMessageContent.trim()) {
                const [id] = await db('messages').insert({
                    convo_id: convoId,
                    role: 'assistant',
                    content: assistantMessageContent,
                    created_at: new Date(),
                    updated_at: new Date(),
                }).returning('id');
                assistantMessageId = id;
                res.sseSend!({ type: 'final', messageId: assistantMessageId, role: 'assistant', content: assistantMessageContent });
            } else {
                logger.warn(`Assistant response was empty for convo ${convoId}.`);
                res.sseSend!({ type: 'final', messageId: null, role: 'assistant', content: "[No response generated]" });
            }

            // --- Auto-Titling Logic ---
            if (isFirstUserMessage && aiProvider.generateTitle) {
                logger.info(`First user message in convo ${convoId}, generating title...`);
                try {
                    const generatedTitle = await aiProvider.generateTitle(sanitizedMessage);
                    if (generatedTitle && generatedTitle !== convo.title) {
                        await db('convos')
                            .where({ id: convoId })
                            .update({ title: generatedTitle, updated_at: new Date() });
                        logger.info(`Auto-updated title for convo ${convoId} to: "${generatedTitle}"`);
                        // Send title update via SSE
                        res.sseSend!({ type: 'titleUpdate', convoId: convoId, newTitle: generatedTitle });
                    }
                } catch (titleError) {
                    logger.error(`Failed to generate or update title for convo ${convoId}:`, titleError);
                }
            } else if (isFirstUserMessage) {
                logger.warn(`AI provider does not support generateTitle method. Skipping auto-title for convo ${convoId}.`);
            }


            res.sseSend!({ type: 'done' }); // Signal end of stream
            res.end(); // Close SSE connection

        } else { // Non-streaming response
            assistantMessageContent = (completion as CompletionResponse).message;
            if (assistantMessageContent.trim()) {
                const [id] = await db('messages').insert({
                    convo_id: convoId,
                    role: 'assistant',
                    content: assistantMessageContent,
                    created_at: new Date(),
                    updated_at: new Date(),
                }).returning('id');
                assistantMessageId = id;
            } else {
                logger.warn(`Assistant response was empty for convo ${convoId}.`);
                assistantMessageContent = "[No response generated]";
            }

            let responsePayload: any = {
                response: assistantMessageContent,
                userMessageId: userMessageId,
                assistantMessageId: assistantMessageId,
            };

            // --- Auto-Titling Logic (Non-Streaming) ---
            if (isFirstUserMessage && aiProvider.generateTitle) {
                logger.info(`First user message in convo ${convoId}, generating title...`);
                try {
                    const generatedTitle = await aiProvider.generateTitle(sanitizedMessage);
                    if (generatedTitle && generatedTitle !== convo.title) {
                        await db('convos')
                            .where({ id: convoId })
                            .update({ title: generatedTitle, updated_at: new Date() });
                        logger.info(`Auto-updated title for convo ${convoId} to: "${generatedTitle}"`);
                        responsePayload.newTitle = generatedTitle; // Include title in JSON response
                        responsePayload.convoId = convoId;
                    }
                } catch (titleError) {
                    logger.error(`Failed to generate or update title for convo ${convoId}:`, titleError);
                }
            } else if (isFirstUserMessage) {
                logger.warn(`AI provider does not support generateTitle method. Skipping auto-title for convo ${convoId}.`);
            }

            res.json(responsePayload);
        }

    } catch (err) {
        logger.error(`Error in /send/${convoIdParam}:`, err);
        // Check if headers already sent (likely if streaming error occurred mid-stream)
        if (!res.headersSent) {
            // If SSE setup, send error event before closing
            if (shouldStream && res.sseSend) {
                res.sseSetup!(); // Ensure headers are set if not already
                res.sseSend!({ type: 'error', message: err.message || 'An internal error occurred.' });
                res.sseSend!({ type: 'done' });
                res.end();
            } else {
                res.status(500).json({ message: err.message || 'An internal error occurred.' });
            }
        } else {
            // Headers sent, likely streaming. Just end the response. Client should handle interruption.
            logger.warn(`Error occurred in /send/${convoIdParam} after headers sent. Ending response.`);
            res.end();
        }
    }
});

app.delete('/convo/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
        if (id === 'all') {
            logger.info(`User ${userId} requested deletion of all conversations.`);
            // Find all convo IDs for the user
            const convoIds = await db('convos').where({ user_id: userId }).pluck('id');
            if (convoIds.length > 0) {
                // Delete messages first (optional, depends on cascade settings)
                // await db('messages').whereIn('convo_id', convoIds).del();
                // Then delete convos
                await db('convos').whereIn('id', convoIds).del(); // Rely on ON DELETE CASCADE if set
                logger.info(`Deleted ${convoIds.length} conversations for user ${userId}.`);
            }
            res.json({ message: 'All conversations deleted successfully.' });
        } else {
            const convoIdNum = parseInt(id, 10);
            if (isNaN(convoIdNum)) {
                res.status(400).json({ message: 'Invalid conversation ID.' });
                return;
            }

            logger.info(`User ${userId} requested deletion of conversation ${convoIdNum}.`);
            // Verify ownership and delete
            const deletedCount = await db('convos')
                .where({ id: convoIdNum, user_id: userId })
                .del(); // Rely on ON DELETE CASCADE

            if (deletedCount === 0) {
                res.status(404).json({ message: 'Conversation not found or you do not have permission to delete it.' });
                return;
            }
            logger.info(`Deleted conversation ${convoIdNum} for user ${userId}.`);
            res.json({ message: 'Conversation deleted successfully.' });
        }
    } catch (err) {
        logger.error(`Error during DELETE /convo/${id} for user ${userId}:`, err);
        res.status(500).json({ message: 'Failed to delete conversation(s).' });
    }
});

// --- Sharing Routes ---

app.post('/convo/:id/share', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const convoIdNum = parseInt(id, 10);
    if (isNaN(convoIdNum)) {
        return res.status(400).json({ message: 'Invalid conversation ID.' });
    }

    try {
        // Find convo and verify ownership
        const convo = await db('convos').where({ id: convoIdNum, user_id: req.user!.id }).first();
        if (!convo) {
            return res.status(404).json({ message: 'Conversation not found or access denied.' });
        }

        // Generate or retrieve existing token
        let shareToken = convo.share_token;
        let sharedTimestamp = convo.shared_at || new Date(); // Use existing or current time

        if (!shareToken) {
            shareToken = uuidv4(); // Generate a new unique token
            sharedTimestamp = new Date(); // Set timestamp when first shared
            const updated = await db('convos')
                .where({ id: convoIdNum })
                .update({
                    share_token: shareToken,
                    shared_at: sharedTimestamp,
                });
            if (!updated) throw new Error("Failed to update conversation with share token.");
            logger.info(`Generated share token for convo ${convoIdNum}.`);
        } else {
            logger.info(`Retrieving existing share token for convo ${convoIdNum}.`);
            // Optionally: Update shared_at timestamp each time share is requested?
            // await db('convos').where({ id: convoIdNum }).update({ shared_at: new Date() });
            // sharedTimestamp = new Date();
        }

        res.json({
            message: 'Share link generated successfully.',
            shareToken: shareToken,
            sharedAt: sharedTimestamp // Return the timestamp used
        });

    } catch (err) {
        logger.error(`Error generating share link for convo ${id}:`, err);
        res.status(500).json({ message: 'Failed to generate share link.' });
    }
});

app.delete('/convo/:id/share', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const convoIdNum = parseInt(id, 10);
    if (isNaN(convoIdNum)) {
        return res.status(400).json({ message: 'Invalid conversation ID.' });
    }

    try {
        const updatedCount = await db('convos')
            .where({ id: convoIdNum, user_id: req.user!.id })
            .update({
                share_token: null,
                shared_at: null,
            });

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'Conversation not found or sharing not enabled/access denied.' });
        }

        logger.info(`Revoked share token for convo ${convoIdNum}.`);
        res.json({ message: 'Sharing revoked successfully.' });

    } catch (err) {
        logger.error(`Error revoking share link for convo ${id}:`, err);
        res.status(500).json({ message: 'Failed to revoke sharing.' });
    }
});

// Public route to view shared conversation
app.get('/share/:token', async (req: Request, res: Response): Promise<any> => {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 10) { // Basic token format check
        return res.status(400).json({ message: 'Invalid share token format.' });
    }

    try {
        // Find the conversation by the share token
        const convo = await db('convos')
            .select('id', 'title', 'user_id', 'shared_at') // Select necessary fields
            .where({ share_token: token })
            .first();

        if (!convo || !convo.shared_at) {
            // If convo not found OR shared_at is null (meaning revoked)
            return res.status(404).json({ message: 'Shared conversation not found or link is invalid/revoked.' });
        }

        // Fetch messages created up to the shared_at timestamp
        const messages = await db('messages')
            .where({ convo_id: convo.id })
            .andWhere('created_at', '<=', convo.shared_at) // Crucial filter
            .orderBy('created_at', 'asc')
            .select('role', 'content', 'created_at'); // Select only needed fields for public view

        // Optionally fetch original user's email (if desired, consider privacy)
        // const owner = await db('users').where({ id: convo.user_id }).select('email').first();

        res.json({
            title: convo.title,
            sharedAt: convo.shared_at,
            messages: messages,
            // ownerEmail: owner ? owner.email : null // Optional
        });

    } catch (err) {
        logger.error(`Error fetching shared conversation with token ${token.substring(0, 8)}...:`, err);
        res.status(500).json({ message: 'Failed to retrieve shared conversation.' });
    }
});

// --- Server Start ---
async function startServer() {
    try {
        await runMigrations(); // Run migrations before starting server
        // await db.destroy(); // Close connection after migration if needed? Usually keep it open.

        app.listen(config.port, () => {
            console.log(chalk.blue(figlet.textSync('Genius', { horizontalLayout: 'full' })));
            console.log(chalk.green(`✨ Genius is running!`));
            console.log(chalk.white(`🔗 Listening on: ${chalk.cyan(`${config.baseUrl}`)}`));
            console.log(chalk.white(`🧠 AI Provider: ${chalk.yellow(config.aiProvider)}`));
            if (config.aiProvider === 'openai') console.log(chalk.white(`   Model: ${chalk.yellow(config.openaiModel)}`));
            if (config.aiProvider === 'ollama') console.log(chalk.white(`   Model: ${chalk.yellow(config.ollamaModel)} @ ${config.ollamaBaseUrl}`));
            console.log(chalk.white(`📚 Universe: ${chalk.yellow(config.universe)} @ ${config.universeUrl}`));
            console.log(chalk.white(`💾 Database: ${chalk.yellow(config.dbType)} ${config.dbType === 'sqlite' ? `(${config.dbFile})` : ''}`));
            console.log(chalk.white(`🪵 Log Level: ${chalk.yellow(config.logLevel)}`));
        });
    } catch (err) {
        logger.error('❌ Error starting server:', err);
        process.exit(1);
    }
}

startServer();

// Optional: Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server and DB connection');
    // Close server, DB connection etc.
    await db.destroy();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server and DB connection');
    await db.destroy();
    process.exit(0);
});
