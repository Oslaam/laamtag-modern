const fs = require('fs');
const path = require('path');

const SUPPLY = 5000;

// 1. Where are your source files? 
const sourceDir = path.join(__dirname, 'nft-assets'); 
// 2. Where should the 5000 files go? (We'll put them in a folder called 'assets')
const outputDir = path.join(__dirname, 'assets');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const imageSource = path.join(sourceDir, 'template.gif');
const jsonSource = path.join(sourceDir, 'template.json');

// Safety Check
if (!fs.existsSync(imageSource) || !fs.existsSync(jsonSource)) {
    console.error(`❌ ERROR: Could not find files in ${sourceDir}`);
    console.error("Make sure nft-assets/template.gif and nft-assets/template.json exist!");
    process.exit(1);
}

console.log("🚀 Generating 5000 items... this may take a minute.");

for (let i = 0; i < SUPPLY; i++) {
    const destImage = path.join(outputDir, `${i}.gif`);
    const destJson = path.join(outputDir, `${i}.json`);

    // Copy the gif
    fs.copyFileSync(imageSource, destImage);
    
    // Copy and update the JSON
    const data = JSON.parse(fs.readFileSync(jsonSource, 'utf8'));
    data.name = `LAAMTAG Genesis #${i + 1}`;
    data.image = `${i}.gif`;
    
    // Update the internal file reference
    if (data.properties && data.properties.files) {
        data.properties.files[0].uri = `${i}.gif`;
    }
    
    fs.writeFileSync(destJson, JSON.stringify(data, null, 2));
}

console.log(`Success! 5000 items created in the 'assets' folder.`);