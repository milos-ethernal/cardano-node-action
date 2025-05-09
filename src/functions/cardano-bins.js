import { readdirSync, statSync, rmdirSync, mkdirSync, writeFileSync } from 'fs';
import { URL } from 'url';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { rimraf } from 'rimraf';

const exec = promisify(execCallback);

const CARDANO_NODE_VERSION = "8.7.3"
const BINS_BASE_URL = 'https://github.com/IntersectMBO/cardano-node';

const getPlatformReleaseUrl = async () => {
    const core = require('@actions/core');
    const tag = core.getInput('tag');
    const platform = process.platform;
    let file_name = '';
    if (platform === 'linux') {
        file_name = `cardano-node-${tag}-linux.tar.gz`;
    }
    else if (platform === 'darwin') {
        file_name = `cardano-node-${tag}-macos.tar.gz`;
    }
    else if (platform === 'win32') {
        file_name = `cardano-node-${tag}-win64.zip`;
    }
    else {
        throw new Error(`Platform ${platform} not supported`);
    }
    return `${BINS_BASE_URL}/releases/download/${tag}/${file_name}`;
};
export const downloadRelease = async () => {
    const url = await getPlatformReleaseUrl();
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const urlObj = new URL(url);
    const file_name = urlObj.pathname.split('/').pop();
    if (!file_name) {
        throw new Error('Unable to determine the file name from the URL');
    }
    const dir = './bins';
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, file_name);
    writeFileSync(filePath, Buffer.from(buffer));
};
export const unpackRelease = async () => {
    const url = await getPlatformReleaseUrl();
    const urlObj = new URL(url);
    const file_name = urlObj.pathname.split('/').pop();
    if (!file_name) {
        throw new Error('Unable to determine the file name from the URL');
    }
    const dir = './bins';
    const filePath = path.join(dir, file_name);
    try {
        if (['linux', 'darwin', 'win32'].includes(process.platform)) {
            await exec(`tar -xf "${filePath}" -C "${dir}"`);

            // Assuming the tar archive contains a single top-level directory
            const files = readdirSync(dir);
            const extractedDir = files.find(file => statSync(path.join(dir, file)).isDirectory());

            if (extractedDir) {
                await exec(`mv "${path.join(dir, extractedDir)}"/* "${dir}"`);
                rmdirSync(path.join(dir, extractedDir));
            }
        } else {
            throw new Error(`Platform ${process.platform} not supported`);
        }
    } catch (error) {
        console.error(`Error occurred while unpacking: ${error}`);
        throw error;
    }
};

export const moveToRunnerBin = async () => {
    const path = "/bin";
    console.log(`GITHUB_WORKSPACE: ${path}`);
    try {
        await exec(`sudo mv ./bins/* ${path}`);
        rimraf.sync("./bins");
    }
    catch (error) {
        console.error('Error occurred:', error);
        throw error;
    }
}