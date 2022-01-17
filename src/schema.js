const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Query {
    sayHi: String!
    getUsers: [User]
    messages: [Message]
    viewer: User!
    user(username: String!): User
  }

  type Message {
    id: ID!
    user: String!
    content: String!
    createdAt: String!
  }

  type RegisterKey {
    registerKey: String!
    remainingUses: Int!
  }

  type User {
    id: ID!
    email: String!
    password: String!
    username: String!
    createdAt: String!
    roles: [Role]
    permissions: [Permission]
  }

  enum Role {
    USER
    ADMIN
  }

  enum Permission {
    useChat
    read_own_user
  }

  input RegisterInput {
    username: String!
    password: String!
    confirmPassword: String!
    email: String!
    registerKey: String!
  }

  type Mutation {
    register(registerInput: RegisterInput): User!
    login(username: String!, password: String!): String
    createMessage(username: String!, content: String!): Message!
    createRegisterKey(registerKey: String!, remainingUses: Int!): RegisterKey!
    registerValidateKey(registerKey: String!): Boolean!
    registerValidateEmail(email: String!): Boolean!
    registerValidateUsername(username: String!): Boolean!
    registerValidatePassword(
      password: String!
      confirmPassword: String!
    ): Boolean!
  }

  type Subscription {
    newUser: User!
    messageCreated: [Message!]
  }
`;

module.exports = typeDefs;
