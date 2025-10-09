const fs = require('fs');
const path = require('path');
const https = require('https');

const WEBPERL_VERSION = 'v0.09-beta';
const WEBPERL_BASE_URL = `https://github.com/haukex/webperl/releases/download/${WEBPERL_VERSION}`;
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'webperl');

const files = [
    'webperl.js',
    'emperl.js',
    'emperl.wasm',
    'emperl.data'
];

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                return downloadFile(response.headers.location, dest)
                    .then(resolve)
                    .catch(reject);
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function main() {
    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    console.log('Downloading WebPerl files...');

    for (const file of files) {
        const url = `${WEBPERL_BASE_URL}/${file}`;
        const dest = path.join(PUBLIC_DIR, file);

        if (fs.existsSync(dest)) {
            console.log(`${file} already exists, skipping...`);
            continue;
        }

        console.log(`Downloading ${file}...`);
        try {
            await downloadFile(url, dest);
            console.log(`Downloaded ${file}`);
        } catch (error) {
            console.error(`Failed to download ${file}:`, error.message);
            process.exit(1);
        }
    }

    console.log('WebPerl files downloaded successfully!');
}

main();