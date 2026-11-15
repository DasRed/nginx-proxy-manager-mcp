#!/usr/bin/env node
import {loadConfig} from './config.ts';
import {createHttpServer} from './http.ts';
import {NpmClient} from './npm-client.ts';
import {packageInfo, selectTools} from './server.ts';

function main(): void {
    const config     = loadConfig();
    const client     = new NpmClient(config.npm);
    const toolCount  = selectTools(config).length;
    const httpServer = createHttpServer(config, client);

    httpServer.listen(config.port, config.host, () => {
        console.log(`${packageInfo.name} v${packageInfo.version} listening on http://${config.host}:${config.port}${config.path} (npm: ${config.npm.url}; read-only: ${config.readOnly}; tools: ${toolCount})`);
    });

    const shutdown = (signal: string): void => {
        console.log(`Received ${signal}, shutting down`);
        httpServer.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

try {
    main();
}
catch (error) {
    console.error(`Startup failed: ${(error as Error).message}`);
    process.exit(1);
}
