import {ApolloServer} from 'apollo-server-express';
import {ApolloGateway, RemoteGraphQLDataSource} from "@apollo/gateway";
import express from 'express';
import { createServer } from 'http';
import {expressjwt as jwt, GetVerificationKey} from "express-jwt";
import jwksRsa from 'jwks-rsa'
import cors from 'cors';


async function main() {
    const app = express()
    app.use(cors());
    const secret = jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 60,
        jwksUri: 'https://dev-qqza0qh0olb1esh4.us.auth0.com/.well-known/jwks.json'
    })
    app.use(
        jwt({
            secret: secret as GetVerificationKey,
            algorithms: ['RS256'],
            audience: 'https://dev.thrum.co',
            credentialsRequired: false
        })
    );

    const gateway = new ApolloGateway({
        serviceList: [
            {name: 'organizations', url: 'http://localhost:4000/query'},
        ],
        buildService({name, url}) {
            return new RemoteGraphQLDataSource({
                url,
                willSendRequest({request, context}) {
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
