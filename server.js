const csvParser = require("csv-parser");
const express = require("express");
const fs = require("fs");
const fsPromises = fs.promises;
const helmet = require("helmet");
const logger = require("morgan")
const multer = require("multer");
const readline = require("readline");
const path = require("path");
const AdmZip = require("adm-zip");
const nunjucks = require("nunjucks");

const PUBLIC_DIR = "public";
const UPLOADS_DIR = ".tmp";
const SPLIT_SIZE = 1024**2 * 100; // 100 MiB

const port = parseInt(process.env.PORT) || 8080;
const app = express();
const uploader = multer({ dest: UPLOADS_DIR });

function splitExit(filePath) {
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath, fileExt);
    return [fileName, fileExt];
}

function getChunkFileName(origFile, counter) {
    const [filePrefix, fileExt] = splitExit(origFile);
    return `${filePrefix}_${counter}${fileExt}`;
}

async function readHeaders(filePath) {
    return new Promise(((resolve, reject) => {
        const readStream = fs.createReadStream(filePath).pipe(csvParser());

        readStream.on('error', reject);
        readStream.on('headers', (headers) => {
            readStream.destroy();
            resolve(headers);
        });
    }));
}

async function sendError(res, upload, error) {
    await fsPromises.unlink(upload);
    res.status(400);
    return res.json({ error });
}

async function postUpload(req, res) {
    const origFile = req.file.originalname;
    const upload = req.file.path;

    if (!req.file) {
        return sendError(res, upload, 'No file specified!');
    }

    if (!origFile.endsWith('.csv')) {
        return sendError(res, upload, "That's not a CSV!");
    }

    if (req.file.size < 1024**2 * 2) {
        return sendError(res, upload, "The minimum size is 2 MiB");
    }

    const headers = await readHeaders(upload);
    const zipFileName = path.join(UPLOADS_DIR, `${splitExit(origFile)[0]}.zip`)
    const zip = new AdmZip();

    const rl = readline.createInterface({
        input: fs.createReadStream(upload),
        crlfDelay: Infinity
    });


    let headerLine = true;
    let fileCounter = 0;
    let currentFile = getChunkFileName(origFile, fileCounter);
    let currentFileContent = "";

    for await (const line of rl) {
        // TODO: This is hacky
        if (headerLine) {
            headerLine = false;
            continue;
        }

        if (currentFileContent.length >= SPLIT_SIZE) {
            zip.addFile(
                currentFile,
                `${headers}\n${currentFileContent}`
            );
            console.log(currentFile);

            fileCounter += 1;
            currentFile = getChunkFileName(origFile, fileCounter);
            currentFileContent = "";
        }
        else {
            currentFileContent += `${line}\n`;
        }
    }

    // Last chunk
    if (currentFileContent.length > 0) {
        zip.addFile(
            currentFile,
            `${headers}\n${currentFileContent}`
        );
        console.log(currentFile);
    }

    // Create archive
    zip.writeZip(zipFileName);
    console.log(`Created ${zipFileName}!`);

    // Clean up
    await fsPromises.unlink(upload);

    // Send the result
    res.download(
        path.resolve(zipFileName),
        path.basename(zipFileName),
        async () => fsPromises.unlink(zipFileName)
    );
}

app.use(express.static(PUBLIC_DIR));
app.use(logger(process.env.NODE_ENV === 'development' ? "dev" : 'combined'));
app.use(helmet());

app.post("/", uploader.single('file'), postUpload);

app.listen(port, () => console.log(`Server listening on port ${port}...`));
