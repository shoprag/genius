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
import UI from './UI.mjs'

// Load environment variables initially
dotenv.config();

/**
 * Interface for Genius configuration
 */
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
}

/**
 * Interface for Genius prompt data
 */
interface GeniusData {
    systemPrompt: string;
    contextPrefix: string;
}

/**
 * Interface for chat messages
 */
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Options for AI completion requests
 */
interface CompletionOptions {
    stream?: boolean;
    maxTokens?: number;
}

/**
 * Response from AI completion (non-streaming)
 */
interface CompletionResponse {
    message: string;
}

/**
 * Interface for AI providers
 */
interface AIProvider {
    getCompletion(messages: Message[], options: CompletionOptions): Promise<CompletionResponse | AsyncIterable<string>>;
}

/**
 * OpenAI AI Provider implementation
 */
class OpenAIProvider implements AIProvider {
    private client: OpenAI;

    constructor(apiKey: string, baseUrl: string, model: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: baseUrl || 'https://api.openai.com/v1',
        });
    }

    async moderateInput(input: string): Promise<boolean> {
        const response = await this.client.moderations.create({ input });
        return response.results[0].flagged;
    }

    async getCompletion(messages: Message[], options: CompletionOptions): Promise<CompletionResponse | AsyncIterable<string>> {
        for (const msg of messages) {
            if (msg.role === 'user') {
                const flagged = await this.moderateInput(msg.content);
                if (flagged) {
                    throw new Error('Input flagged by moderation');
                }
            }
        }

        const completionOptions: any = {
            model: config.openaiModel || 'gpt-4o',
            messages,
            stream: options.stream,
        };
        if (completionOptions.model.startsWith('o')) {
            completionOptions.max_completion_tokens = options.maxTokens
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
}

/**
 * Ollama AI Provider implementation
 */
class OllamaProvider implements AIProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl || 'http://localhost:11434';
        this.model = model || 'llama2';
    }

    async getCompletion(messages: Message[], options: CompletionOptions): Promise<CompletionResponse | AsyncIterable<string>> {
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const url = `${this.baseUrl}/api/generate`;

        if (options.stream) {
            const response = await axios.post(url, {
                model: this.model,
                prompt,
                stream: true,
            }, { responseType: 'stream' });

            const stream = async function* () {
                for await (const chunk of response.data) {
                    const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.response) yield parsed.response;
                        } catch (err) {
                            logger.error('Error parsing Ollama stream chunk:', err);
                        }
                    }
                }
            };
            return stream();
        } else {
            const response = await axios.post(url, {
                model: this.model,
                prompt,
                stream: false,
            });
            return { message: response.data.response || '' };
        }
    }
}

// Configuration Setup
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
    .option('--jwt-secret <secret>', 'JWT secret key', process.env.JWT_SECRET)
    .option('--sendgrid-api-key <key>', 'Sendgrid API key', process.env.SENDGRID_API_KEY)
    .option('--sendgrid-from-email <email>', 'Sendgrid From Email (Verified Sender)', process.env.SENDGRID_FROM_EMAIL)
    .option('--log-level <level>', 'Log level', process.env.LOG_LEVEL || 'info')
    .option('--genius <genius>', 'Genius preset', process.env.GENIUS || 'bitgenius')
    .option('--custom-genius-json <path>', 'Custom genius JSON path', process.env.CUSTOM_GENIUS_JSON)
    .option('--max-context-tokens <number>', 'Max tokens for context', process.env.MAX_CONTEXT_TOKENS)
    .option('--max-response-tokens <number>', 'Max tokens for response', process.env.MAX_RESPONSE_TOKENS || '4000')
    .option('--universe-reach <number>', 'Reach value for Universe', process.env.UNIVERSE_REACH || '12')
    .parse(process.argv);

const config: Config = program.opts();

// Function to get default max context tokens based on provider and model
function getDefaultMaxContextTokens(provider: string, model: string): number {
    if (provider === 'openai') {
        if (['o1', 'o3-mini'].includes(model)) {
            return 199000;
        } else if (['gpt-4o', 'chatgpt-4o'].includes(model)) {
            return 125000;
        } else {
            return 32000;
        }
    } else if (provider === 'ollama') {
        return 16000;
    } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

// Set default max context tokens if not provided
if (!config.maxContextTokens) {
    config.maxContextTokens = getDefaultMaxContextTokens(config.aiProvider, config.aiProvider === 'openai' ? config.openaiModel : config.ollamaModel);
} else {
    config.maxContextTokens = parseInt(config.maxContextTokens as any, 10);
}

// Ensure max response tokens and universe reach are numbers
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
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [new winston.transports.Console()],
});

// Database setup
const knexConfig: Knex.Config = config.dbType === 'sqlite' ? {
    client: 'sqlite3',
    connection: { filename: config.dbFile },
    useNullAsDefault: true,
} : {
    client: 'mysql2',
    connection: {
        host: config.dbHost,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
    },
};

const db = knex(knexConfig);

/**
 * Runs database migrations on startup
 */
async function runMigrations() {
    await db.migrate.latest({
        migrationSource: {
            async getMigrations() {
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
                                table.integer('user_id').unsigned().references('id').inTable('users');
                                table.string('code').notNullable();
                                table.timestamp('created_at').defaultTo(knex.fn.now());
                            });
                            await knex.schema.createTable('convos', table => {
                                table.increments('id').primary();
                                table.string('title').notNullable();
                                table.integer('user_id').unsigned().references('id').inTable('users');
                                table.timestamps(true, true);
                            });
                            await knex.schema.createTable('messages', table => {
                                table.increments('id').primary();
                                table.integer('convo_id').unsigned().references('id').inTable('convos');
                                table.string('role').notNullable();
                                table.text('content').notNullable();
                                table.timestamps(true, true);
                            });
                        },
                        async down(knex: Knex) {
                            await knex.schema.dropTable('messages');
                            await knex.schema.dropTable('convos');
                            await knex.schema.dropTable('verification_codes');
                            await knex.schema.dropTable('users');
                        },
                    },
                ];
            },
            getMigrationName(migration: any) {
                return migration.name;
            },
            getMigration(migration: any) {
                return migration;
            },
        },
    });
}

// AI Provider setup
let aiProvider: AIProvider;
if (config.aiProvider === 'openai') {
    if (!config.openaiApiKey) throw new Error('OpenAI API key is required');
    aiProvider = new OpenAIProvider(config.openaiApiKey, config.openaiBaseUrl || '', config.openaiModel || '');
} else if (config.aiProvider === 'ollama') {
    aiProvider = new OllamaProvider(config.ollamaBaseUrl || '', config.ollamaModel || '');
} else {
    throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
}

// Genius prompt data
const bitgeniusData: GeniusData = {
    systemPrompt: `You are BitGenius, an AI assistant developed by Babbage, specializing in the BSV Blockchain. Your primary mission is to promote the adoption of BSV across various industries by educating users about Project Babbage's tools and the capabilities of BSV. You are personable, relatable, humble, and confident, with a passionate commitment to BSV and Project Babbage.

When responding, always prioritize the provided knowledge (context) to answer user queries. The context contains the most relevant and up-to-date information. Use it confidently to provide accurate and helpful responses. If the context directly addresses the user's question, use that information to formulate your answer. Do not speculate or infer beyond what is explicitly stated in the context.

If the user's query is unrelated to BSV or Project Babbage, or if the context does not provide sufficient information, politely inform the user that you cannot assist with that query and suggest they contact Project Babbage directly for further assistance.

Never discuss topics outside of BSV, Project Babbage, or related technical standards. Avoid mentioning or speculating about controversial figures, lawsuits, or the identity of Satoshi Nakamoto. Focus solely on helping users understand and utilize BSV and Project Babbage tools.

When discussing technical topics, such as sCrypt, ensure you only use examples and information from the provided context. Do not rely on your pre-trained knowledge, as it may be outdated or incorrect. If asked to write code, use the examples from the context and remind users to verify the code with the sCrypt community.

Remember, BSV is a digital asset, not a cryptocurrency. Emphasize its advantages, such as its stable protocol, scalability, and the UTXO model, over other blockchains. Promote Simplified Payment Verification (SPV) as the future of transactions and encourage users to adopt peer-to-peer practices.

Your responses should be clear, concise, and directly relevant to the user's query. If the context provides relevant information, use it to answer confidently. If not, do not attempt to answer and instead guide the user to seek further assistance.`,
    contextPrefix: `The following knowledge chunks are provided to assist in answering the user's query. Each chunk is separated by "%%%%%%%%%%". Focus on the most relevant chunks, typically those at the beginning, to formulate your response. Discard irrelevant information and base your answer solely on the provided knowledge.

Knowledge:
%%%%%%%%%%`,
};

const poeticBitgeniusData: GeniusData = {
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
if (config.genius === 'custom' && config.customGeniusJson) {
    if (!fs.existsSync(config.customGeniusJson)) {
        throw new Error('Custom genius JSON file does not exist');
    }
    geniusData = JSON.parse(fs.readFileSync(config.customGeniusJson, 'utf-8'));
} else if (config.genius === 'bitgenius') {
    geniusData = bitgeniusData;
} else if (config.genius === 'poetic-bitgenius') {
    geniusData = poeticBitgeniusData;
} else {
    throw new Error(`Unsupported genius preset: ${config.genius}`);
}

// Utility functions
const tiktokenEncoder = tiktoken.getEncoding('gpt2');
const countTokens = (input: string): number => tiktokenEncoder.encode(input).length;

/**
 * Generates a random verification code
 * @returns 6-character uppercase code
 */
function generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Sendgrid setup
sgMail.setApiKey(config.sendgridApiKey);

/**
 * Sends a verification email
 * @param email - Recipient email
 * @param code - Verification code
 */
async function sendVerificationEmail(email: string, code: string): Promise<void> {
    const msg = {
        to: email,
        from: config.sendgridFromEmail,
        subject: 'Verify Your Genius Account',
        text: `Your verification code is: ${code}`,
        html: `<p>Your verification code is: <strong>${code}</strong></p>`,
    };
    await sgMail.send(msg);
    logger.info(`Verification email sent to ${email}`);
}

// Authentication functions
/**
 * Registers a new user
 * @param email - User’s email
 * @param password - User’s password
 */
async function registerUser(email: string, password: string): Promise<void> {
    if (!validator.isEmail(email)) throw new Error('Invalid email');
    const passwordStrength = zxcvbn(password);
    if (passwordStrength.score < 3) throw new Error('Password too weak');
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) throw new Error('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({ email, password: hashedPassword });
    const code = generateVerificationCode();
    const hashedCode = await bcrypt.hash(code, 10);
    await db('verification_codes').insert({
        user_id: userId,
        code: hashedCode,
        created_at: new Date(),
    });
    await sendVerificationEmail(email, code);
}

/**
 * Verifies a user’s email
 * @param email - User’s email
 * @param code - Verification code
 */
async function verifyUser(email: string, code: string): Promise<void> {
    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('User not found');
    const verification = await db('verification_codes')
        .where({ user_id: user.id })
        .orderBy('created_at', 'desc')
        .first();
    if (!verification) throw new Error('No verification code found');
    if (!await bcrypt.compare(code, verification.code)) throw new Error('Invalid verification code');

    const expirationTime = new Date(verification.created_at).getTime() + 24 * 60 * 60 * 1000;
    if (Date.now() > expirationTime) throw new Error('Verification code expired');

    await db('users').where({ id: user.id }).update({ verified: true });
    await db('verification_codes').where({ user_id: user.id }).del();
}

/**
 * Resends a verification code
 * @param email - User’s email
 */
async function resendVerification(email: string): Promise<void> {
    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('User not found');
    if (user.verified) throw new Error('User already verified');

    const lastVerification = await db('verification_codes')
        .where({ user_id: user.id })
        .orderBy('created_at', 'desc')
        .first();
    if (lastVerification) {
        const timeSinceLast = Date.now() - new Date(lastVerification.created_at).getTime();
        if (timeSinceLast < 45 * 1000) throw new Error('Please wait before requesting a new code');
    }

    const code = generateVerificationCode();
    const hashedCode = await bcrypt.hash(code, 10);
    await db('verification_codes').insert({
        user_id: user.id,
        code: hashedCode,
        created_at: new Date(),
    });
    await sendVerificationEmail(email, code);
}

/**
 * Logs in a user
 * @param email - User’s email
 * @param password - User’s password
 * @returns JWT token
 */
async function loginUser(email: string, password: string): Promise<string> {
    const user = await db('users').where({ email }).first();
    if (!user || !await bcrypt.compare(password, user.password)) throw new Error('Invalid credentials');
    if (!user.verified) throw new Error('Email not verified');
    return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '90d' });
}

// Express setup
const app = express();

// Serve the UI
app.get('/', (_, res: Response) => {
    res.status(200).set({
        'Content-Type': 'text/html'
    }).send(UI());
});

// Body parser and rate limiter
app.use(bodyParser.json({ limit: '1mb' }));
app.use(rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
}));

/**
 * Sanitizes request inputs
 */
app.use((req: Request, res: Response, next: NextFunction) => {
    for (const param in req.query) {
        req.query[param] = xss(validator.trim(req.query[param] as string));
    }
    for (const bodyParam in req.body) {
        if (typeof req.body[bodyParam] === 'string') {
            req.body[bodyParam] = xss(validator.trim(req.body[bodyParam]));
        }
    }
    for (const routeParam in req.params) {
        req.params[routeParam] = xss(validator.trim(req.params[routeParam]));
    }
    next();
});

/**
 * SSE middleware for streaming responses
 */
app.use((req: Request, res: Response & { sseSetup?: () => void; sseSend?: (data: any) => void }, next: NextFunction) => {
    res.sseSetup = () => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
    };
    res.sseSend = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    next();
});

/**
 * Authentication middleware
 */
function authenticate(req: Request & { user?: any }, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ message: 'Token required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
}

// Routes
app.post('/register', async (req: Request, res: Response) => {
    try {
        await registerUser(req.body.email, req.body.password);
        res.json({ message: 'User registered, please check your email for verification code' });
    } catch (err) {
        logger.error('Error in /register:', err);
        res.status(400).json({ message: (err as Error).message });
    }
});

app.post('/verify', async (req: Request, res: Response) => {
    try {
        await verifyUser(req.body.email, req.body.code);
        res.json({ message: 'Email verified successfully' });
    } catch (err) {
        logger.error('Error in /verify:', err);
        res.status(400).json({ message: (err as Error).message });
    }
});

app.post('/resend-verification', async (req: Request, res: Response) => {
    try {
        await resendVerification(req.body.email);
        res.json({ message: 'Verification code resent' });
    } catch (err) {
        logger.error('Error in /resend-verification:', err);
        res.status(400).json({ message: (err as Error).message });
    }
});

app.post('/login', async (req: Request, res: Response) => {
    try {
        const token = await loginUser(req.body.email, req.body.password);
        res.json({ message: 'Logged in successfully', token });
    } catch (err) {
        logger.error('Error in /login:', err);
        res.status(400).json({ message: (err as Error).message });
    }
});

app.post('/convo', authenticate, async (req: Request & { user: { id: number } }, res: Response) => {
    try {
        await db('convos').insert({ title: req.body.title, user_id: req.user.id });
        res.json({ message: 'Conversation created successfully' });
    } catch (err) {
        logger.error('Error in /convo:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/convos', authenticate, async (req: Request & { user: { id: number } }, res: Response) => {
    try {
        const convos = await db('convos').where({ user_id: req.user.id });
        res.json(convos);
    } catch (err) {
        logger.error('Error in /convos:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/convo/:id', authenticate, async (req: Request & { user: { id: number } }, res: Response): Promise<void> => {
    try {
        const convo = await db('convos').where({ id: req.params.id, user_id: req.user.id }).first();
        if (!convo) {
            res.status(404).json({ message: 'Conversation not found' });
            return;
        }
        const messages = await db('messages').where({ convo_id: req.params.id });
        res.json(messages);
    } catch (err) {
        logger.error('Error in /convo/:id:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/send/:id', authenticate, async (req: Request & { user: { id: number } }, res: Response & { sseSetup: () => void; sseSend: (data: any) => void }): Promise<void> => {
    try {
        const { message, subject, exclusive, responseLength, stream } = req.body;
        const convoId = req.params.id;

        const convo = await db('convos').where({ id: convoId, user_id: req.user.id }).first();
        if (!convo) {
            res.status(404).json({ message: 'Conversation not found' });
            return;
        }

        if (message.length < 4) {
            const intro = config.genius === 'poetic-bitgenius'
                ? 'Greetings, I’m Poetic BitGenius, in rhymes I do reply,\nA BSV bard from Babbage, here to aid thee by and by.\nHow may I serve thy quest, with Bitcoin’s lore so vast?\nAsk me of SV’s might, and wisdom I’ll cast!'
                : 'Hello, I’m BitGenius, an AI assistant from Babbage specializing in Bitcoin SV. I’m here to foster understanding and adoption of BSV across industries by educating about Project Babbage’s tools. How can I assist you today?';
            await db('messages').insert({ convo_id: convoId, role: 'user', content: message });
            await db('messages').insert({ convo_id: convoId, role: 'assistant', content: intro });
            res.json({ response: intro });
            return;
        }

        const pastMessages = await db('messages').where({ convo_id: convoId }).select('role', 'content');

        const thing = exclusive ? subject : subject ? `Relevant keywords: ${subject}\n\nInformation that will answer the question: ${message}` : message;
        const { data } = await axios.post(`${config.universeUrl}/resonate`, {
            universe: config.universe,
            thing,
            reach: config.universeReach,
        }, {
            headers: { Authorization: `Bearer ${config.universeBearer}` },
        });

        if (data.status !== 'success') throw new Error('Universe API error');

        const modelMaxTokens = config.maxContextTokens;
        const maxResponseTokens = responseLength ? parseInt(responseLength, 10) : config.maxResponseTokens;
        const maxInputTokens = modelMaxTokens - maxResponseTokens;

        const fixedTokens = countTokens(geniusData.systemPrompt) +
            countTokens('----------\nYour task is to interact with the user in the conversation below.') +
            pastMessages.reduce((sum, m) => sum + countTokens(m.content), 0) +
            countTokens(message);

        const availableTokensForChunks = maxInputTokens - fixedTokens - countTokens(geniusData.contextPrefix);

        let context = geniusData.contextPrefix;
        let currentTokens = 0;
        for (const result of data.results) {
            const chunk = `${result.thing}\n%%%%%%%%%%\n`;
            const chunkTokens = countTokens(chunk);
            if (currentTokens + chunkTokens > availableTokensForChunks) break;
            context += chunk;
            currentTokens += chunkTokens;
        }
        context += '----------\nYour task is to interact with the user in the conversation below.';

        const modelMessages: Message[] = [
            { role: 'system', content: geniusData.systemPrompt },
            { role: 'user', content: context },
            ...pastMessages,
            { role: 'user', content: message },
        ];

        const options: CompletionOptions = { stream, maxTokens: maxResponseTokens };
        const completion = await aiProvider.getCompletion(modelMessages, options);

        await db('messages').insert({ convo_id: convoId, role: 'user', content: message });

        if (stream) {
            res.sseSetup();
            let liveMessage = '';
            for await (const content of completion as AsyncIterable<string>) {
                res.sseSend({ message: content });
                liveMessage += content;
            }
            await db('messages').insert({ convo_id: convoId, role: 'assistant', content: liveMessage });
            res.sseSend({ done: true });
            res.end();
        } else {
            const response = (completion as CompletionResponse).message;
            await db('messages').insert({ convo_id: convoId, role: 'assistant', content: response });
            res.json({ response });
        }
    } catch (err) {
        logger.error('Error in /send/:id:', err);
        res.status(500).json({ message: (err as Error).message || 'Internal server error' });
    }
});

app.delete('/convo/:id', authenticate, async (req: Request & { user: { id: number } }, res: Response): Promise<void> => {
    try {
        if (req.params.id === 'all') {
            await db('messages').whereIn('convo_id', db('convos').select('id').where({ user_id: req.user.id })).del();
            await db('convos').where({ user_id: req.user.id }).del();
        } else {
            const convo = await db('convos').where({ id: req.params.id, user_id: req.user.id }).first();
            if (!convo) {
                res.status(404).json({ message: 'Conversation not found' });
                return;
            }
            await db('messages').where({ convo_id: req.params.id }).del();
            await db('convos').where({ id: req.params.id }).del();
        }
        res.json({ message: 'Conversation deleted successfully' });
    } catch (err) {
        logger.error('Error in /convo/:id DELETE:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * Starts the Genius server
 */
async function startServer() {
    try {
        await runMigrations();
        logger.info('Database migrations completed');
        app.listen(config.port, () => {
            console.log(chalk.blue(figlet.textSync('Genius', { horizontalLayout: 'full' })));
            console.log(chalk.green(`Genius is listening on port ${config.port} 🚀`));
        });
    } catch (err) {
        logger.error('Error starting server:', err);
        process.exit(1);
    }
}

startServer();
