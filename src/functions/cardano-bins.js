import { readdirSync, statSync, rmdirSync, rmSync, mkdirSync, writeFileSync, renameSync } from 'fs';
import { URL } from 'url';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { rimraf } from 'rimraf';
import * as core from '@actions/core';

const exec = promisify(execCallback);

const BINS_BASE_URL = 'https://github.com/IntersectMBO/cardano-node';
const LINUX_AMD64_RELEASE_TAG = '10.5.4';

const isTagGreaterThan = (tag, version) => {
    const tagParts = tag.replace(/^v/, '').split('-')[0].split('.').map(Number);
    const versionParts = version.split('.').map(Number);

    for (let index = 0; index < versionParts.length; index++) {
        const tagPart = tagParts[index] || 0;
        const versionPart = versionParts[index] || 0;

        if (Number.isNaN(tagPart)) {
            return false;
        }

        if (tagPart > versionPart) {
            return true;
        }

        if (tagPart < versionPart) {
            return false;
        }
    }

    return false;
};

const getPlatformReleaseUrl = async () => {   
    const tag = core.getInput('tag');
    const platform = process.platform;
    let file_name = '';
    if (platform === 'linux') {
        const archSuffix = isTagGreaterThan(tag, LINUX_AMD64_RELEASE_TAG) ? '-amd64' : '';
        file_name = `cardano-node-${tag}-linux${archSuffix}.tar.gz`;
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
                rmSync(filePath);
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
    const runnerBinPath = "/bin";
    console.log(`GITHUB_WORKSPACE: ${runnerBinPath}`);
    try {
        const newPrefix = core.getInput('prefix');
        const sufix = core.getInput('sufix');
        const dir = './bins/' + newPrefix;
        const files = readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);

            if (!statSync(filePath).isFile()) {
                continue;
            }

            const prefixedFile = file.includes('cardano') && newPrefix != 'cardano' ? file.replaceAll('cardano', newPrefix) : file;
            const renamedFile = file.includes('cardano') && sufix ? `${prefixedFile}-${sufix}` : prefixedFile;

            if (renamedFile != file) {
                renameSync(filePath, path.join(dir, renamedFile));
            }

            await exec(`sudo mv "${path.join(dir, renamedFile)}" "${path.join(runnerBinPath, renamedFile)}"`);
        }

        rimraf.sync(dir);
    }
    catch (error) {
        console.error('Error occurred:', error);
        throw error;
    }
}