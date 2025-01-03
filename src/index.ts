import {ApolloServer} from 'apollo-server-express';
import {ApolloGateway, RemoteGraphQLDataSource} from "@apollo/gateway";
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

import {auth} from "express-oauth2-jwt-bearer";

async function main() {
    const app = express()
    app.use(cors());
    const jwtCheck = auth({
        audience: 'https://app.quarq.ai',
        issuerBaseURL: 'https://dev-bgp2nowofpq65ihn.us.auth0.com/',
        tokenSigningAlg: 'RS256',
        authRequired: false
    });

    app.use(jwtCheck);

    const gateway = new ApolloGateway({
        serviceList: [
            {name: 'organizations', url: 'http://thrum-organizations-service.default.svc.cluster.local/query'},
            {name: 'partners', url: 'http://thrum-partners-service.default.svc.cluster.local/query'},
        ],
        buildService({name, url}) {
            return new RemoteGraphQLDataSource({
                url,
                willSendRequest({request, context}) {
                    console.log(context.user);
                    request.http?.headers.set('user', context.user ? JSON.stringify(context.user) : "");
                    request.http?.headers.set('authorization', context.authorization || "");
                }
            });
        }
    });

    const server = new ApolloServer({
        gateway,
        context: async ({req}) => {
            // @ts-ignores
            const user = req.auth;
            const authorization = req.headers.authorization || "";
            return {user, authorization}
        },
    });

    await server.start()
    server.applyMiddleware({app, path: '/'});
    server.applyMiddleware({app, path: '/query'});
    createServer(app).listen({port: process.env.PORT || 4242}).on('listening', () => {
        console.log(`🚀 Server ready at http://localhost:${process.env.PORT || 4242}${server.graphqlPath}`);
    });
}
main();
