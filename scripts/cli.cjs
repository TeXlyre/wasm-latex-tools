#!/usr/bin/env node

const { copyAssets } = require('./copy-assets.cjs');

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
    if (command === 'copy-assets') {
        await copyAssets(args[0]);
    } else {
        printHelp();
    }
}

function printHelp() {
    console.log('wasm-latex-tools CLI\n');
    console.log('Usage:');
    console.log('  wasm-latex-tools copy-assets [destination]\n');
    console.log('Commands:');
    console.log('  copy-assets [dest]  Copy WASM and Perl assets to destination');
    console.log('                      Default destination: ./public/core\n');
    console.log('Examples:');
    console.log('  wasm-latex-tools copy-assets');
    console.log('  wasm-latex-tools copy-assets ./static/wasm');
    console.log('  wasm-latex-tools copy-assets ./public/my-assets');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});