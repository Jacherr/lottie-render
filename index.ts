import { port, auth } from './config.json';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { unlinkSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
const renderLottie = require('puppeteer-lottie');

enum StatusCodes {
    OK = 200,
    BadRequest = 400,
    UNAUTHORIZED = 401
}

const INVALID_LOTTIE_JSON_STRING = "invalid lottie json";

async function getBody(connection: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
        let body = '';

        connection.on('data', (chunk) => {
            body += chunk;
        });

        connection.on('end', () => {
            resolve(body);
        });
    })
}

async function end(response: ServerResponse, code: StatusCodes, message?: string | Buffer) {
    response.statusCode = code;
    await new Promise<void>((resolve) => response.write(message, () => resolve()));
    await new Promise<void>((resolve) => response.end(() => resolve()));
}

let server = createServer(async (connection, response) => {
    let headers = connection.headers;

    if(connection.method == 'GET') {
        return await end(response, StatusCodes.OK, (process.uptime() * 1000).toString());
    }

    if(headers.authorization !== auth) {
        return await end(response, StatusCodes.UNAUTHORIZED);
    }

    let body = await getBody(connection);
    let lottie: any;

    try {
        lottie = JSON.parse(body);
    } catch {
        return await end(response, StatusCodes.BadRequest, INVALID_LOTTIE_JSON_STRING);
    }

    let hash = createHash('md5').update(lottie).digest('hex');

    let filename = hash + '.gif';

    try {
        await Promise.race([
            new Promise<void>(async (resolve) => {
                await renderLottie({
                    output: filename,
                    animationData: JSON.parse(lottie)
                });
                resolve()
            }),
            new Promise((_, reject) => {
                setTimeout(reject, 10000);
            })
        ]);
    } catch {
        return await end(response, StatusCodes.BadRequest, 'timed out when rendering sticker');
    }


    let gif = readFileSync(filename);
    unlinkSync(filename);

    return await end(response, StatusCodes.OK, gif);
});

server.on('listening', () => console.log('OK'));

server.listen(port);