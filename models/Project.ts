import mongoose, { Schema, Document, models, model, Types } from "mongoose";

export type Framework = "nextjs" | "react" | "html-css-js" | "vanilla-js";

export interface ISnapshot {
  _id:      Types.ObjectId;
  content:  string;
  message:  string;
  createdAt: Date;
}

export interface IFile {
  _id:       Types.ObjectId;
  fileName:  string;
  filePath:  string;
  content:   string;
  fileType:  string;
  language:  string;
  snapshots: ISnapshot[];
  updatedAt: Date;
}

export interface IMessage {
  role:      "user" | "assistant";
  content:   string;
  createdAt: Date;
}

export interface IProject extends Document {
  userId:            Types.ObjectId;
  name:              string;
  description:       string;
  framework:         Framework;
  // Plain object — no Map, works with JSON from any client
  onboardingAnswers: Record<string, string>;
  files:             IFile[];
  agentMessages:     IMessage[];
  status:            "generating" | "ready" | "error";
  vercelProjectId?:    string;
  vercelDeploymentId?: string;
  vercelUrl?:           string;
  vercelStatus?:        string;
  createdAt:         Date;
  updatedAt:         Date;
}

const SnapshotSchema = new Schema(
  {
    content: { type: String, required: true },
    message: { type: String, default: "Manual snapshot" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const FileSchema = new Schema<IFile>(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    content:  { type: String, default: "" },
    fileType: { type: String, default: "text" },
    language: { type: String, default: "plaintext" },
    snapshots: { type: [SnapshotSchema], default: [] },
  },
  { timestamps: true }
);

const MessageSchema = new Schema<IMessage>({
  role:      { type: String, enum: ["user", "assistant"], required: true },
  content:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ProjectSchema = new Schema<IProject>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name:        { type: String, required: true },
    description: { type: String, default: "" },
    framework:   {
      type: String,
      enum: ["nextjs", "react", "html-css-js", "vanilla-js"],
      required: true,
    },
    // Schema.Types.Mixed accepts any plain object — no Map casting issues
    onboardingAnswers: { type: Schema.Types.Mixed, default: {} },
    files:             { type: [FileSchema], default: [] },
    agentMessages:     { type: [MessageSchema], default: [] },
    status:            {
      type: String,
      enum: ["generating", "ready", "error"],
      default: "generating",
    },
    vercelProjectId:    { type: String },
    vercelDeploymentId: { type: String },
    vercelUrl:           { type: String },
    vercelStatus:        { type: String },
  },
  { timestamps: true }
);

export const Project =
  (models.Project as mongoose.Model<IProject>) ??
  model<IProject>("Project", ProjectSchema);