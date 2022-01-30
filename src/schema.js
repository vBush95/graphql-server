const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Query {
    sayHi: String!
    getUsers: [User]
    getMessages: [Message]
    viewer: User!
    user(username: String!): User
    me: User
    getUsernameColor(username: String!): String!
  }

  type Message {
    _id: ID!
    username: String!
    content: String!
    createdAt: String!
  }

  type RegisterKey {
    registerKey: String!
    remainingUses: Int!
  }

  type User {
    _id: ID
    email: String
    password: String
    username: String
    createdAt: String
    roles: [Role]
    permissions: [Permission]
    lastSeen: String
    settings: UserSettings
  }

  type LoginResponse {
    accessToken: String!
    user: User!
  }

  type UserSettings {
    usernameColor: String!
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
    login(username: String!, password: String!): LoginResponse!
    logout: Boolean!
    updateLastSeen(timestamp: String!): String!
    addToUsersInChat: [User]
    removeFromUsersInChat: [User]
    createMessage(username: String!, content: String!): Message!
    updateUserSettingsNameColor(color: String!): User!
    createRegisterKey(registerKey: String!, remainingUses: Int!): RegisterKey!
    registerValidateKey(registerKey: String!): Boolean!
    registerValidateEmail(email: String!): Boolean!
    registerValidateUsername(username: String!): Boolean!
    registerValidatePassword(
      password: String!
      confirmPassword: String!
    ): Boolean!
    revokeRefreshTokensForUser(username: String!): Boolean!
  }

  type Subscription {
    userCreated: User
    messageCreated: Message
    usersOnline: [User]
    usernameColorChanged: User
  }
`;

module.exports = typeDefs;
