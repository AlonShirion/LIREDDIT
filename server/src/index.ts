import 'reflect-metadata';
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {buildSchema} from 'type-graphql';
import {HelloResolver} from './resolvers/hello';
import {PostResolver} from './resolvers/post';
import {UserResolver} from './resolvers/user';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import {__prod__, COOKIE_NAME} from './constants';
import {MyContext} from './types';
import cors from 'cors';
import {createConnection} from 'typeorm';
import {User} from './entities/User';
import {Post} from './entities/Post';
import path from 'path';
import {Updoot} from './entities/Updoot';
import {createUserLoader} from './utils/createUserLoader';
import {createUpdootLoader} from './utils/createUpdootLoader';

const main = async () => {
  await createConnection({
    type: 'postgres',
    database: 'lireddit2',
    username: 'postgres',
    password: 'postgres',
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, './migration/*')],
    entities: [Post, User, Updoot],
  });

  // uncomment when you want to insert the db the mock data,
  // you need to init const conn with creatConnection
  // const conn = await createConnection...
  // await conn.runMigrations();

  // Delete all posts
  // await Post.delete({});

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: 'lax', //csrf
        secure: __prod__, // cookie only works in https
      },
      saveUninitialized: false,
      secret: 'qweqiduhqiwduhqwkdjhqwd',
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({req, res}): MyContext => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
    }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log('server started on localhost:4000');
  });
};

main().catch((err) => {
  console.log(err);
});
