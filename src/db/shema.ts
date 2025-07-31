
/**
 * Users
 */

import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const userSchema = pgTable(
    'users',
    {
        id: serial('id').primaryKey().notNull(),
        username: text('username').notNull(),
        password: text('password').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => {
                return new Date();
            }),
    },
    (users) => ({
        userIdIndex: index('users_id_idx').on(users.id),
    })
);


export const usersRelations = relations(userSchema, ({ many }) => ({
    tokens: many(tokenSchema),
}));

/**
 * Tokens
 */

export const tokenSchema = pgTable(
    'tokens',
    {
        id: serial('id').primaryKey().notNull(),
        ownerId: integer('owner_id').references(() => userSchema.id),
        accessToken: text('access_token').notNull(),
        refreshToken: text('refresh_token').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (tokens) => ({
        tokenIdIndex: index('tokens_id_idx').on(tokens.id),
    }),
);

export const tokensRelations = relations(tokenSchema, ({ one }) => ({
    owner: one(userSchema, {
        fields: [tokenSchema.ownerId],
        references: [userSchema.id],
    }),
}));
