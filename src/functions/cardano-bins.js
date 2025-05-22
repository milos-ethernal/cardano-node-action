import { readdirSync, statSync, rmdirSync, mkdirSync, writeFileSync } from 'fs';
import { URL } from 'url';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { rimraf } from 'rimraf';
import * as core from '@actions/core';

const exec = promisify(execCallback);

const BINS_BASE_URL = 'https://github.com/IntersectMBO/cardano-node';

const getPlatformReleaseUrl = async () => {   
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
    const prefix = core.getInput('prefix');
    const dir = './bins/' + prefix;
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
    const prefix = core.getInput('prefix');
    const dir = './bins/' + prefix;
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
        const newPrefix = core.getInput('prefix');
        const dir = './bins/' + newPrefix;
        if (newPrefix != 'cardano') {
            // Get all files with "cardano" in the name and rename them
            await exec(`find ${dir} -name "*cardano*" -type f -exec bash -c '
                        newname=$(echo "$1" | sed "s/cardano/${newPrefix}/g")
                        sudo mv "$1" "$newname"
                    ' _ {} \\;`);
        } 
        await exec(`sudo mv ${dir}/* ${path}`);
        rimraf.sync(dir);
    }
    catch (error) {
        console.error('Error occurred:', error);
        throw error;
    }
}