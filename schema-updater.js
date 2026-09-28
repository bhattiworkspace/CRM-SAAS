const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const indexesToAdd = {
  Lead: ['  @@index([organizationId])', '  @@index([organizationId, status])', '  @@index([organizationId, createdAt])'],
  Company: ['  @@index([organizationId])'],
  Contact: ['  @@index([organizationId])', '  @@index([organizationId, companyId])'],
  Deal: ['  @@index([organizationId])', '  @@index([organizationId, status])', '  @@index([organizationId, pipelineId])'],
  Activity: ['  @@index([organizationId])', '  @@index([organizationId, createdAt])'],
  Task: ['  @@index([organizationId])', '  @@index([organizationId, status])'],
  AuditLog: ['  @@index([organizationId])', '  @@index([organizationId, timestamp])', '  @@index([userId])'],
  Notification: ['  @@index([organizationId, userId])', '  @@index([userId, isRead])'],
  AiScoreRecord: ['  @@index([organizationId])', '  @@index([organizationId, entityType, entityId])'],
  AiSummary: ['  @@index([organizationId])'],
  AiConversation: ['  @@index([organizationId, userId])'],
  CommunicationConversation: ['  @@index([organizationId])', '  @@index([organizationId, channel])'],
  CommunicationMessage: ['  @@index([organizationId])', '  @@index([conversationId])', '  @@index([externalMessageId])'],
  CommunicationConsent: ['  @@index([organizationId])'],
  Workflow: ['  @@index([organizationId])', '  @@index([organizationId, status])'],
  WorkflowExecution: ['  @@index([organizationId])', '  @@index([workflowId])'],
  Sequence: ['  @@index([organizationId])'],
  SequenceEnrollment: ['  @@index([organizationId])', '  @@index([sequenceId])', '  @@index([organizationId, status])'],
  UsageRecord: ['  @@index([organizationId])', '  @@index([organizationId, resourceType, createdAt])'],
  Subscription: ['  @@index([organizationId])'],
  Membership: ['  @@index([organizationId])', '  @@index([userId])']
};

for (const [model, indexes] of Object.entries(indexesToAdd)) {
  const modelRegex = new RegExp(`(model ${model} \\{[\\s\\S]*?)(\\})`);
  schema = schema.replace(modelRegex, `$1\n${indexes.join('\n')}\n$2`);
}

const orgModule = `
model OrganizationModule {
  id             String   @id @default(cuid())
  organizationId String
  moduleCode     String
  enabled        Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, moduleCode])
}
`;

schema = schema.replace(/model BillingEvent \{[\s\S]*?\}/, match => match + '\n' + orgModule);
schema = schema.replace(/(model Organization \{[\s\S]*?)(})/, `$1  organizationModules   OrganizationModule[]\n$2`);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully');
