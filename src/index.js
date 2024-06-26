import dotenv from 'dotenv';
import { downloadRelease, unpackRelease, moveToRunnerBin } from './functions/cardano-bins.js';

dotenv.config();
await downloadRelease();
await unpackRelease();
await moveToRunnerBin();
//await appendToGitHubPath(fullPath);