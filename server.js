const express = require("express");
const fs = require("fs");
const fsPromises = fs.promises;
const helmet = require("helmet");
const logger = require("morgan")
const multer = require("multer");
const readline = require("readline");
const path = require("path");
const archiver = require("archiver");

const PUBLIC_DIR = "public";
const UPLOADS_DIR = ".tmp";
const SPLIT_SIZE = 1024**2 * 100; // 100 MiB

const env = process.env.NODE_ENV || 'production';
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

function debugLog(msg, ...args) {
    if (env === 'development') {
        console.debug(msg, ...args);
    }
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

    const rl = readline.createInterface({
        input: fs.createReadStream(upload),
        crlfDelay: Infinity
    });

    let headerLine = "";
    let fileCounter = 0;
    let currentFile = getChunkFileName(origFile, fileCounter);
    let currentFileContent = "";

    const zipFileName = path.join(UPLOADS_DIR, `${splitExit(origFile)[0]}.zip`);
    const zipStream = fs.createWriteStream(zipFileName);
    const zip = archiver('zip', { zlib: { level: 9 } });

    zip.pipe(zipStream);

    for await (const line of rl) {
        if (headerLine === "") {
            headerLine = line;
            continue;
        }

        if (currentFileContent.length >= SPLIT_SIZE) {
            zip.append(
                `${headerLine}\n${currentFileContent}`,
                { name: currentFile }
            );
            debugLog(currentFile);

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
        await zip.append(
            `${headerLine}\n${currentFileContent}`,
            { name: currentFile }
        );
        debugLog(currentFile);
    }

    // Handle zip events
    zip.on('error', (e) => {
        console.error(e.message);
        res.sendStatus(500);
    });

    zipStream.on('close', async () => {
        // Clean up
        await fsPromises.unlink(upload);

        // Send the result
        res.download(
            path.resolve(zipFileName),
            path.basename(zipFileName),
            async () => fsPromises.unlink(zipFileName)
        );
    });

    zipStream.on('error', (e) => {
        console.error(e.message);
        res.sendStatus(500);
    });

    // Close the zip file
    zip.finalize();
}

app.use(express.static(PUBLIC_DIR));
app.use(logger(env === 'development' ? "dev" : 'combined'));
app.use(helmet());

app.post("/", uploader.single('file'), postUpload);

app.listen(port, () => console.log(`Server listening on port ${port}...`));
