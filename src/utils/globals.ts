import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export const DATA_FOLDER = 'data';
export const TOKENS_FILE = path.join(DATA_FOLDER, 'token.txt');
export const REFRESH_MAP_FILE = path.join(DATA_FOLDER, 'refresh_map.json');
export const ERROR_TOKENS_FILE = path.join(DATA_FOLDER, 'error_token.txt');
export const SEED_MAP_FILE = path.join(DATA_FOLDER, 'seed_map.json');
export const FP_MAP_FILE = path.join(DATA_FOLDER, 'fp_map.json');

export let count = 0;
export let tokenList: string[] = [];
export let errorTokenList: string[] = [];
export let refreshMap: Record<string, { token: string; timestamp: number }> = {};
export let seedMap: Record<string, { token: string; conversations: string[] }> = {};
export let fpMap: Record<string, Record<string, any>> = {};

export function setCount(n: number) { count = n; }
export function incrementCount() { count++; }

// Initialize data folder
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
}

// Load token list
if (fs.existsSync(TOKENS_FILE)) {
  const lines = fs.readFileSync(TOKENS_FILE, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('#')) tokenList.push(t);
  }
} else {
  fs.writeFileSync(TOKENS_FILE, '');
}

// Load error tokens
if (fs.existsSync(ERROR_TOKENS_FILE)) {
  const lines = fs.readFileSync(ERROR_TOKENS_FILE, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('#')) errorTokenList.push(t);
  }
} else {
  fs.writeFileSync(ERROR_TOKENS_FILE, '');
}

// Load refresh map
if (fs.existsSync(REFRESH_MAP_FILE)) {
  try {
    refreshMap = JSON.parse(fs.readFileSync(REFRESH_MAP_FILE, 'utf-8'));
  } catch { refreshMap = {}; }
} else {
  refreshMap = {};
}

// Load seed map
if (fs.existsSync(SEED_MAP_FILE)) {
  try {
    seedMap = JSON.parse(fs.readFileSync(SEED_MAP_FILE, 'utf-8'));
  } catch { seedMap = {}; }
} else {
  seedMap = {};
}

// Load fp map
if (fs.existsSync(FP_MAP_FILE)) {
  try {
    fpMap = JSON.parse(fs.readFileSync(FP_MAP_FILE, 'utf-8'));
  } catch { fpMap = {}; }
} else {
  fpMap = {};
}

if (tokenList.length > 0) {
  logger.info(`Token list count: ${tokenList.length}, Error token list count: ${errorTokenList.length}`);
  logger.info('-'.repeat(60));
}
