/**
 * models/User.ts
 *
 * IMPORTANT: Only import this file in Node.js runtime contexts
 * (API routes, Server Actions, Server Components).
 * Never import from middleware.ts or any Edge Runtime code.
 */

import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IUser extends Document {
  name:       string;
  email:      string;
  image?:     string;
  provider:   "google" | "github" | "demo";
  providerId: string;
  githubToken?:    string; // Encrypted or plain OAuth token
  githubUsername?: string;
  vercelToken?:    string; // Encrypted
  vercelTeamId?:   string;
  createdAt:  Date;
  updatedAt:  Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:           { type: String, required: true },
    email:          { type: String, required: true, unique: true },
    image:          { type: String },
    provider:       { type: String, enum: ["google", "github", "demo"], required: true },
    providerId:     { type: String, required: true },
    githubToken:    { type: String },
    githubUsername: { type: String },
    vercelToken:    { type: String },
    vercelTeamId:   { type: String },
  },
  { timestamps: true }
);

// Guard against model re-registration in Next.js hot-reload
export const User = (models.User as mongoose.Model<IUser>) ?? model<IUser>("User", UserSchema);
