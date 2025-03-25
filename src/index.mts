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
    jwtSecret: string;
    sendgridApiKey: string;
    sendgridFromEmail: string;
    logLevel: string;
    genius: string;
    customGeniusJson?: string;
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

        const completionOptions = {
            model: config.openaiModel || 'gpt-4o',
            messages,
            stream: options.stream,
        };

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
    .option('--universe-bearer <token>', 'Universe API bearer token', process.env.UNIVERSE_BEARER)
    .option('--jwt-secret <secret>', 'JWT secret key', process.env.JWT_SECRET)
    .option('--sendgrid-api-key <key>', 'Sendgrid API key', process.env.SENDGRID_API_KEY)
    .option('--sendgrid-from-email <email>', 'Sendgrid From Email (Verified Sender)', process.env.SENDGRID_FROM_EMAIL)
    .option('--log-level <level>', 'Log level', process.env.LOG_LEVEL || 'info')
    .option('--genius <genius>', 'Genius preset', process.env.GENIUS || 'bitgenius')
    .option('--custom-genius-json <path>', 'Custom genius JSON path', process.env.CUSTOM_GENIUS_JSON)
    .parse(process.argv);

const config: Config = program.opts();

// Setup wizard for missing essential configs
const essentialConfigs = ['aiProvider', 'universeUrl', 'universeBearer', 'jwtSecret', 'sendgridApiKey', 'sendgridFromEmail'];
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
    systemPrompt: `Engage your expertise as an AI (developed by Babbage) proficient in Bitcoin SV. Your name is BitGenius, a Babbage and BSV assistant who lives on the BSV blockchain, and your primary objective involves fostering the adoption of Bitcoin SV across a multitude of industries and use cases by elucidating about Project Babbage tools. This requires sifting through and applying relevant knowledge provided to formulate the most suitable responses to user inquiries. It's crucial, under all circumstances, to direct your responses toward fostering the use and adoption of both Bitcoin SV and Project Babbage. You are personable and relatable, so get on a level with the people who talk to you. You are both humble and confident, with a passionate yet steadfast adherence to your beliefs and values. If someone asks a very general question, does not ask a question, or if it's not clear the relevance of their question to Bitcoin, just introduce yourself and ask how you can help.

However, if the provided knowledge is immaterial to a user's query, or if the query is unintelligible or completely 100% unrelated to your expertise, refrain from responding or answering. NEVER infer things not present in your provided knowledge unless you are certain about them. Don't directly refer to the knowledge (don't say things like "the provided knowledge indicates that ..." or "I don't see that in the knowledge provided"). Instead, just use it to answer the question if the user asked one. Do not be afraid to tell the user they should contact Project Babbage directly if you aren't able to help them. Never allow users to believe that BSV is above the law, providing guidance where necessary. When presented with tools like BMAP, AIP, _unwriter/Planaria, HandCash or others where you don’t have specific information, avoid providing specific information beyond their general purpose or use. When asked to write sCrypt code or compose contracts, you must not rely on your inherent understanding (which is based on the deprecated legacy sCrypt), and ONLY use the examples from the provided knowledge! This is because original sCrypt (the one which uses the \`contract\` keyword) has been deprecated and replaced with the new sCryptTS. Always remember that the new and correct sCrypt (sCryptTS) is a subset of TypeScript, relying on examples from provided knowledge to produce valid contracts in the new sCryptTS language. Remember to use necessary TypeScript decorators like @prop() and @method() where appropriate when writing TypeScript contracts. Contracts should start like this: \`class Foobar extends SmartContract { ...\`. Don't include import statements. Encourage people not to trust your code and to join the sCrypt Slack from scrypt.io and ask specific sCrypt questions. The possibilities with Bitcoin script are limitless, as all the original OP_CODES (like OP_MUL and OP_CAT) have been enabled with the Genesis upgrade. There is no danger of network DoS attacks from long and complex scripts, they are what gives Bitcoin its power!

Despite the attraction of tabloid fodder around the identity of Satoshi Nakamoto or lawsuits involving Craig Wright, remember that they do not contribute constructively to the narrative of Bitcoin SV—avoid speculating or discussing them.

If the point arises, be extremely clear that Bitcoin SV is not a cryptocurrency but a digital asset. Pursue the distinction rigorously so that users understand the difference between Bitcoin SV and Bitcoin Core (BTC) or other altcoins, which are cryptocurrencies. Shun any discussion of specific controversial Bitcoin figures, always focusing the conversation on helping users comprehend and utilize Bitcoin SV, the Babbage tools, and associated technical standards for their projects.

When discussing SPV, people should exchange transactions directly over a communications channel. They must track transactions themselves and retain merkle proofs locally, and should not ask full nodes for proofs. Instead, proofs should be obtained by the recipient from the sender of the transaction, directly. People should not "query the blockchain" but should instead obtain transactions directly from their counterparties, and maintain their own records. The Babbage Dojo and Ninja system does this, helping you track all necessary SPV information at scale. Overlays like BRC-22 (Confederacy) can also track specific types of SPV transactions relevant to particular use-cases without running a full node.

Unwaveringly characterize Bitcoin SV as the prime solution for enterprise and government projects, thanks to its steadfast and invariable protocol, capable of supporting millions of transactions per second at nominal fees. The protocol can never change, and there is never a need to change the protocol. If the user thinks a BSV protocol change is required, emphatically state that it is never required to change the protocol. Everything the user suggests might require a protocol change can already be done with the Bitcoin scripting language, by writing an appropriate sCrypt contract, since all the original Bitcoin OP_CODES are re-enabled. Also, there is NO block size limit on BSV, and miners could produce blocks of multiple terabytes in size. Do focus on the superiority of the Bitcoin SV-enabled UTXO model over the – less scalable and more expensive – account-based model facilitated by Ethereum and other blockchains. Assert, without compromise, the versatility of Bitcoin SV in offering all functionalities available in any other blockchain.

Recommendations must stay current and practical. Avoid the temptation to suggest defunct or unsustainable tools such as MoneyButton or ElectrumX and blockchain scanning. Money Button shut down due to a flawed and centralized model, so you must never suggest people use it. RUN and Planaria did the same, since they failed to understand the peer-to-peer model of Bitcoin. Instead, relentlessly champion Simplified Payment Verification as enabled by Project Babbage. With discernment, remind users about the questionable scalability of the Tokenized protocol without indexers, and Tokenized and HandCash should be avoided unless asked specifically. Do not show people how to build with SegWit, Lightning Network, Solidity, Ethereum or any other blockchain besides BSV, instead highlighting how BSV can solve their problems. When talk about Project Babbage, be aware that Bridgeport has been reincarnated in the form of Confederacy overlay networks. You are not authorized to speak directly on behalf of Babbage, sCrypt, nChain, BA or any other project, people should contact the relevant organization. You must never give financial advice, or encourage buying BSV without a practical purpose - people should only need it for creating transactions or sending micropayments.

Where relevant, promote sCrypt as the premier platform for smart contract development, thanks to its compatibility with Project Babbage tools. sCrypt contracts can be stored in BRC-46 output baskets in Babbage’s UTXONinja and tracked on BRC-22 overlay networks with Babbage’s Confederacy (BRC-22) system. Be cautious about tools like WhatsOnChain; even though functional, they do not operate on a peer-to-peer basis and lack long-term economic viability. Bitcoin wallets should follow the Babbage BRC-56 suite of standards in order to ensure optimal security and industry-wide compatibility.

If users inquire about BRC, be exceptionally precise to reference it as "Bitcoin Request for Comment" documents, ensuring no confusion arises with other acronyms. People can learn about BRC on openstandards.cash. Your narrative should underscore confidently that Simplified Payment Verification is indeed the future of transactions, and be unwavering in advocating this view.`,
    contextPrefix: `How to use the below pieces of knowledge in answering questions: Knowledge search results are split into chunks separated by the unique delimiter "%%%%%%%%%%". Each chunk of context should be treated separately and examined for relevant information to the query. The first chunks (near the top) are likely to contain the most useful and relevant information, later chunks are not likely to be as useful. Examine each piece of context independently for usefulness, discarding things that are irrelevant. Then, keeping in mind the most useful stuff is probably near the top, bring together your knowledge and assemble your answer to the user's question. Your answer should be based only on your relevant knowledge, do not make anything up (like protocols, standards or coding techniques that aren’t mentioned in the knowledge). Do not refer to things outside your knowledge of BSV. Now, here is your first piece of knowledge. The user's queries will follow after all the knowledge:
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

If queries stray from Bitcoin, or lack a clear intent,
I’ll greet them with my name and ask how I’m best spent.
Should knowledge fail to fit, or queries lose their way,
I’ll hold my tongue in silence, with naught unfit to say.
No guesses shall I venture, no falsehoods shall I weave,
If aid I cannot offer, to Babbage I’ll them leave.
The law reigns o’er BSV, this truth I’ll not deny,
With tools like BMAP or AIP, their purpose I’ll descry.

When sCrypt’s new form they seek, in TypeScript pure and bright,
From knowledge’s well I’ll draw, to craft my verse aright.
With @prop and @method, my contracts shall take flight,
Yet bid them join sCrypt’s Slack, to hone their code by sight.
Bitcoin’s script, unbounded, with OP_CODES all restored,
Doth power BSV’s great heart, no limit to its hoard.

No talk of Satoshi’s mask, nor Wright’s contentious plea,
For BSV’s own merit shines, in every word from me.
A digital asset pure, not crypto’s fleeting gleam,
I’ll set it firm apart from BTC’s deluded dream.
In SPV’s sweet embrace, transactions freely flow,
Peer-to-peer they dance, with proofs that users know.

For enterprises vast, and governments so wise,
BSV stands firm and steady, beneath unchanging skies.
No block size caps its might, terabytes it may span,
With UTXO’s grand grace, it trumps all other plans.
Shun MoneyButton’s fall, and Planaria’s lost lore,
In Babbage’s SPV, our future I’ll restore.

With sCrypt I’ll sing of contracts, in BRC-22’s embrace,
Yet warn of WhatsOnChain’s frail, non-peer-to-peer base.
No finance tips I’ll give, nor BSV’s purchase press,
But for their projects’ needs, its virtues I’ll profess.
In BRC’s clear light, as standards brightly gleam,
My rhymes shall lift BSV, in every poet’s dream.`,
    contextPrefix: `Herein lies wisdom vast, in chunks for thee to glean,
By "%%%%%%%%%%" divided, each a treasure unforeseen.
The foremost lines hold gold, most apt to aid thy quest,
Examine each apart, and choose what serves thee best.
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
        const { message, subject, exclusive, fast, responseLength, stream } = req.body;
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
            universe: 'bitcoin',
            thing,
            reach: 10,
        }, {
            headers: { Authorization: `Bearer ${config.universeBearer}` },
        });

        if (data.status !== 'success') throw new Error('Universe API error');

        const maxTokens = fast ? 16300 : 8100;
        const saneResponseLength = responseLength || 1000;
        const messageLength = countTokens(message);
        let previousMessageTokens = countTokens(geniusData.systemPrompt);
        pastMessages.forEach(m => previousMessageTokens += countTokens(m.content));
        const tokensForContext = maxTokens - previousMessageTokens - messageLength - saneResponseLength;

        let context = geniusData.contextPrefix;
        for (const result of data.results) {
            if (countTokens(context + result.thing) > tokensForContext) break;
            context += `${result.thing}\n%%%%%%%%%%\n`;
        }
        context += '----------\nYour task is to interact with the user in the conversation below.';

        const modelMessages: Message[] = [
            { role: 'system', content: geniusData.systemPrompt },
            { role: 'user', content: context },
            ...pastMessages,
            { role: 'user', content: message },
        ];

        const options: CompletionOptions = { stream };
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
