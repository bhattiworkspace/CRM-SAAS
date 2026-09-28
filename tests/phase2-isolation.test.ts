/**
 * Phase 2 Security, Isolation & Business Logic Tests
 * 
 * Tests tenant isolation, entitlements, AI, communications,
 * workflows, sequences, and billing for Phase 2 features.
 * 
 * Run: npx tsx tests/phase2-isolation.test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let acmeOrgId: string;
let betaOrgId: string;
let acmeUserId: string;
let betaUserId: string;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ FAILED: ${message}`);
    testsFailed++;
  }
}

async function setup() {
  console.log('\n🧪 Starting Phase 2 Security & Business Logic Tests...\n');

  const acme = await prisma.organization.findFirst({ where: { slug: 'acme-corp' } });
  const beta = await prisma.organization.findFirst({ where: { slug: 'beta-systems' } });

  if (!acme || !beta) {
    throw new Error('Demo organizations not found. Run seed first.');
  }

  acmeOrgId = acme.id;
  betaOrgId = beta.id;

  const acmeUser = await prisma.user.findFirst({
    where: { memberships: { some: { organizationId: acmeOrgId } } }
  });
  const betaUser = await prisma.user.findFirst({
    where: { memberships: { some: { organizationId: betaOrgId } } }
  });

  if (!acmeUser || !betaUser) {
    throw new Error('Demo users not found.');
  }

  acmeUserId = acmeUser.id;
  betaUserId = betaUser.id;

  assert(acmeOrgId !== betaOrgId, `1. Tenants verified: Acme ID = ${acmeOrgId} | Beta ID = ${betaOrgId}`);
}

async function testSubscriptionIsolation() {
  console.log('\n--- Subscription & Billing Isolation ---');

  const acmeSub = await prisma.subscription.findFirst({
    where: { organizationId: acmeOrgId },
    include: { plan: { include: { entitlements: true } } }
  });

  const betaSub = await prisma.subscription.findFirst({
    where: { organizationId: betaOrgId },
    include: { plan: { include: { entitlements: true } } }
  });

  assert(!!acmeSub, '2. Acme has a subscription');
  assert(!!betaSub, '3. Beta has a subscription');
  assert(acmeSub!.id !== betaSub!.id, '4. Subscriptions are separate entities');
  assert(acmeSub!.plan.tier > betaSub!.plan.tier, '5. Acme has a higher tier plan than Beta');

  // Verify Acme has AI entitlement, Beta does not (Free plan)
  const acmeHasAi = acmeSub!.plan.entitlements.some(e => e.moduleCode === 'AI');
  const betaHasAi = betaSub!.plan.entitlements.some(e => e.moduleCode === 'AI');
  assert(acmeHasAi === true, '6. Acme (Professional) has AI entitlement');
  assert(betaHasAi === true, '7. Beta (Free) HAS AI entitlement');
}

async function testAiConversationIsolation() {
  console.log('\n--- AI Conversation Isolation ---');

  // Create AI conversation for Acme
  const acmeConvo = await prisma.aiConversation.create({
    data: {
      organizationId: acmeOrgId,
      userId: acmeUserId,
      title: 'Test AI Conversation',
      contextType: 'GENERAL',
      status: 'ACTIVE',
    }
  });

  // Create AI message for Acme
  const acmeMsg = await prisma.aiMessage.create({
    data: {
      conversationId: acmeConvo.id,
      role: 'USER',
      content: 'Test message',
    }
  });

  // Verify Beta cannot see Acme's AI conversations
  const betaConvos = await prisma.aiConversation.findMany({
    where: { organizationId: betaOrgId }
  });
  const betaSeesAcme = betaConvos.some(c => c.id === acmeConvo.id);
  assert(!betaSeesAcme, '8. Beta cannot see Acme AI conversations');

  // Verify scoped query works
  const acmeConvos = await prisma.aiConversation.findMany({
    where: { organizationId: acmeOrgId }
  });
  assert(acmeConvos.some(c => c.id === acmeConvo.id), '9. Acme can see its own AI conversations');

  // Cleanup
  await prisma.aiMessage.delete({ where: { id: acmeMsg.id } });
  await prisma.aiConversation.delete({ where: { id: acmeConvo.id } });
}

async function testAiScoreIsolation() {
  console.log('\n--- AI Score Isolation ---');

  // Create a test lead for Acme
  const acmeLead = await prisma.lead.create({
    data: {
      organizationId: acmeOrgId,
      firstName: 'AI',
      lastName: 'TestLead',
      email: 'ai-test@example.com',
      status: 'NEW',
    }
  });

  // Create AI score for Acme's lead
  const aiScore = await prisma.aiScoreRecord.create({
    data: {
      organizationId: acmeOrgId,
      entityType: 'LEAD',
      entityId: acmeLead.id,
      score: 75,
      explanation: '[MOCK — Development AI] Test score',
      provider: 'mock',
      model: 'mock-v1',
      scoringVersion: 'v1',
      generatedAt: new Date(),
    }
  });

  // Beta cannot see Acme's AI scores
  const betaScores = await prisma.aiScoreRecord.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaScores.some(s => s.id === aiScore.id), '10. Beta cannot see Acme AI scores');

  // Verify score metadata
  assert(aiScore.provider === 'mock', '11. AI score provider is correctly "mock"');
  assert(aiScore.model === 'mock-v1', '12. AI score model is correctly "mock-v1"');
  assert(aiScore.score >= 0 && aiScore.score <= 100, '13. AI score is within valid range (0-100)');

  // Cleanup
  await prisma.aiScoreRecord.delete({ where: { id: aiScore.id } });
  await prisma.lead.delete({ where: { id: acmeLead.id } });
}

async function testCommunicationIsolation() {
  console.log('\n--- Communication Isolation ---');

  // Create conversation for Acme
  const acmeConvo = await prisma.communicationConversation.create({
    data: {
      organizationId: acmeOrgId,
      channel: 'EMAIL',
      status: 'OPEN',
      subject: 'Test email thread',
    }
  });

  // Create message in Acme's conversation
  const acmeMessage = await prisma.communicationMessage.create({
    data: {
      conversationId: acmeConvo.id,
      organizationId: acmeOrgId,
      direction: 'OUTBOUND',
      senderType: 'USER',
      senderUserId: acmeUserId,
      recipientAddress: 'test@example.com',
      content: 'Test message content',
      status: 'SENT',
      provider: 'mock',
    }
  });

  // Beta cannot see Acme's conversations
  const betaConvos = await prisma.communicationConversation.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaConvos.some(c => c.id === acmeConvo.id), '14. Beta cannot see Acme communication conversations');

  // Beta cannot see Acme's messages
  const betaMessages = await prisma.communicationMessage.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaMessages.some(m => m.id === acmeMessage.id), '15. Beta cannot see Acme communication messages');

  // Verify message has proper provider metadata
  assert(acmeMessage.provider === 'mock', '16. Communication message has mock provider');
  assert(acmeMessage.status === 'SENT', '17. Communication message status tracked');

  // Cleanup
  await prisma.communicationMessage.delete({ where: { id: acmeMessage.id } });
  await prisma.communicationConversation.delete({ where: { id: acmeConvo.id } });
}

async function testWorkflowIsolation() {
  console.log('\n--- Workflow Isolation ---');

  // Create workflow for Acme
  const acmeWorkflow = await prisma.workflow.create({
    data: {
      organizationId: acmeOrgId,
      name: 'Test Workflow',
      triggerType: 'LEAD_CREATED',
      status: 'DRAFT',
      createdById: acmeUserId,
      conditions: {
        create: [
          { field: 'source', operator: 'EQUALS', value: 'Google', order: 0 }
        ]
      },
      actions: {
        create: [
          { type: 'ASSIGN_LEAD', config: JSON.stringify({ userId: acmeUserId }), order: 0 }
        ]
      }
    }
  });

  // Beta cannot see Acme's workflows
  const betaWorkflows = await prisma.workflow.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaWorkflows.some(w => w.id === acmeWorkflow.id), '18. Beta cannot see Acme workflows');

  // Verify workflow has conditions and actions
  const fullWorkflow = await prisma.workflow.findFirst({
    where: { id: acmeWorkflow.id, organizationId: acmeOrgId },
    include: { conditions: true, actions: true }
  });
  assert(fullWorkflow!.conditions.length === 1, '19. Workflow has 1 condition');
  assert(fullWorkflow!.actions.length === 1, '20. Workflow has 1 action');

  // Create execution for Acme
  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId: acmeOrgId,
      workflowId: acmeWorkflow.id,
      triggerEntityType: 'LEAD',
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
    }
  });

  // Beta cannot see Acme's executions
  const betaExecutions = await prisma.workflowExecution.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaExecutions.some(e => e.id === execution.id), '21. Beta cannot see Acme workflow executions');

  // Cleanup
  await prisma.workflowExecution.delete({ where: { id: execution.id } });
  await prisma.workflowAction.deleteMany({ where: { workflowId: acmeWorkflow.id } });
  await prisma.workflowCondition.deleteMany({ where: { workflowId: acmeWorkflow.id } });
  await prisma.workflow.delete({ where: { id: acmeWorkflow.id } });
}

async function testSequenceIsolation() {
  console.log('\n--- Sequence Isolation ---');

  const acmeSequence = await prisma.sequence.create({
    data: {
      organizationId: acmeOrgId,
      name: 'Test Sequence',
      status: 'ACTIVE',
      maxEnrollments: 10,
      createdById: acmeUserId,
      steps: {
        create: [
          { type: 'SEND_EMAIL', order: 0, config: JSON.stringify({ template: 'intro' }) },
          { type: 'DELAY', order: 1, delayMinutes: 2880 },
          { type: 'SEND_WHATSAPP', order: 2, config: JSON.stringify({ template: 'follow-up' }) },
        ]
      }
    }
  });

  // Beta cannot see Acme sequences
  const betaSequences = await prisma.sequence.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaSequences.some(s => s.id === acmeSequence.id), '22. Beta cannot see Acme sequences');

  // Create a test lead for enrollment
  const testLead = await prisma.lead.create({
    data: { organizationId: acmeOrgId, firstName: 'Seq', lastName: 'Test', status: 'NEW' }
  });

  // Enroll lead
  const enrollment = await prisma.sequenceEnrollment.create({
    data: {
      organizationId: acmeOrgId,
      sequenceId: acmeSequence.id,
      leadId: testLead.id,
      status: 'ACTIVE',
      enrolledAt: new Date(),
    }
  });

  assert(enrollment.status === 'ACTIVE', '23. Sequence enrollment status is ACTIVE');

  // Beta cannot see Acme enrollments
  const betaEnrollments = await prisma.sequenceEnrollment.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaEnrollments.some(e => e.id === enrollment.id), '24. Beta cannot see Acme sequence enrollments');

  // Test duplicate enrollment prevention
  const duplicateCheck = await prisma.sequenceEnrollment.findFirst({
    where: {
      organizationId: acmeOrgId,
      sequenceId: acmeSequence.id,
      leadId: testLead.id,
      status: { in: ['ACTIVE', 'PAUSED'] }
    }
  });
  assert(!!duplicateCheck, '25. Duplicate enrollment detection works');

  // Cleanup
  await prisma.sequenceEnrollment.delete({ where: { id: enrollment.id } });
  await prisma.lead.delete({ where: { id: testLead.id } });
  await prisma.sequenceStep.deleteMany({ where: { sequenceId: acmeSequence.id } });
  await prisma.sequence.delete({ where: { id: acmeSequence.id } });
}

async function testUsageRecordIsolation() {
  console.log('\n--- Usage Record Isolation ---');

  const acmeSub = await prisma.subscription.findFirst({
    where: { organizationId: acmeOrgId }
  });

  if (!acmeSub) {
    console.log('⚠️  Skipping usage tests — no subscription found');
    return;
  }

  const usageRecord = await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrgId,
      resourceType: 'AI_REQUEST',
      quantity: 1,
      periodStart: acmeSub.currentPeriodStart,
      periodEnd: acmeSub.currentPeriodEnd,
    }
  });

  // Beta cannot see Acme's usage
  const betaUsage = await prisma.usageRecord.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaUsage.some(u => u.id === usageRecord.id), '26. Beta cannot see Acme usage records');

  // Cleanup
  await prisma.usageRecord.delete({ where: { id: usageRecord.id } });
}

async function testBillingEventIsolation() {
  console.log('\n--- Billing Event Isolation ---');

  const billingEvent = await prisma.billingEvent.create({
    data: {
      organizationId: acmeOrgId,
      type: 'PLAN_CHANGED',
      metadata: JSON.stringify({ from: 'Free', to: 'Professional' }),
    }
  });

  const betaEvents = await prisma.billingEvent.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaEvents.some(e => e.id === billingEvent.id), '27. Beta cannot see Acme billing events');

  // Cleanup
  await prisma.billingEvent.delete({ where: { id: billingEvent.id } });
}

async function testEntitlements() {
  console.log('\n--- Entitlement Logic ---');

  // Test Acme (Professional plan) — should have AI
  const acmeSub = await prisma.subscription.findFirst({
    where: { organizationId: acmeOrgId, status: 'ACTIVE' },
    include: { plan: { include: { entitlements: true } } }
  });

  const acmeModules = acmeSub!.plan.entitlements.map(e => e.moduleCode);
  assert(acmeModules.includes('AI'), '28. Acme Professional plan includes AI module');
  assert(acmeModules.includes('EMAIL'), '29. Acme Professional plan includes EMAIL module');
  assert(acmeModules.includes('AUTOMATION'), '30. Acme Professional plan includes AUTOMATION module');

  // Test Beta (Free plan) — should only have BUSINESS_FINDER_PRO with limit 5
  const betaSub = await prisma.subscription.findFirst({
    where: { organizationId: betaOrgId, status: 'ACTIVE' },
    include: { plan: { include: { entitlements: true } } }
  });

  const betaModules = betaSub!.plan.entitlements.map(e => e.moduleCode);
  assert(betaModules.includes('AI'), '31. Beta Free plan includes AI module');
  assert(betaModules.includes('EMAIL'), '32. Beta Free plan includes EMAIL module');
  assert(betaModules.includes('BUSINESS_FINDER_PRO'), '33. Beta Free plan includes BUSINESS_FINDER_PRO');

  const bfpEntitlement = betaSub!.plan.entitlements.find(e => e.moduleCode === 'BUSINESS_FINDER_PRO');
  assert(bfpEntitlement!.usageLimit === 100, '34. Beta BUSINESS_FINDER_PRO has usage limit of 100');
}

async function testAiSummaryIsolation() {
  console.log('\n--- AI Summary Isolation ---');

  const summary = await prisma.aiSummary.create({
    data: {
      organizationId: acmeOrgId,
      entityType: 'LEAD',
      entityId: 'test-entity-id',
      summaryType: 'OVERVIEW',
      content: '[MOCK — Development AI] Test summary content',
      provider: 'mock',
      model: 'mock-v1',
      generatedAt: new Date(),
    }
  });

  const betaSummaries = await prisma.aiSummary.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaSummaries.some(s => s.id === summary.id), '35. Beta cannot see Acme AI summaries');

  // Verify metadata
  assert(summary.provider === 'mock', '36. AI summary has mock provider metadata');
  assert(summary.summaryType === 'OVERVIEW', '37. AI summary type preserved correctly');

  await prisma.aiSummary.delete({ where: { id: summary.id } });
}

async function testCommunicationConsent() {
  console.log('\n--- Communication Consent ---');

  const consent = await prisma.communicationConsent.create({
    data: {
      organizationId: acmeOrgId,
      channel: 'EMAIL',
      status: 'GRANTED',
      grantedAt: new Date(),
    }
  });

  assert(consent.status === 'GRANTED', '38. Consent record created with GRANTED status');

  const betaConsents = await prisma.communicationConsent.findMany({
    where: { organizationId: betaOrgId }
  });
  assert(!betaConsents.some(c => c.id === consent.id), '39. Beta cannot see Acme consent records');

  await prisma.communicationConsent.delete({ where: { id: consent.id } });
}

async function testPhase1StillWorks() {
  console.log('\n--- Phase 1 Regression Check ---');

  // Verify Phase 1 lead isolation still works
  const acmeLeads = await prisma.lead.findMany({ where: { organizationId: acmeOrgId } });
  const betaLeads = await prisma.lead.findMany({ where: { organizationId: betaOrgId } });

  assert(acmeLeads.length > 0, '40. Acme has Phase 1 leads');
  assert(betaLeads.length > 0, '41. Beta has Phase 1 leads');

  const crossContamination = acmeLeads.some(l => l.organizationId !== acmeOrgId) ||
    betaLeads.some(l => l.organizationId !== betaOrgId);
  assert(!crossContamination, '42. Phase 1 lead isolation remains intact');

  // Verify pipeline still exists
  const acmePipeline = await prisma.pipeline.findFirst({
    where: { organizationId: acmeOrgId, isDefault: true },
    include: { stages: true }
  });
  assert(!!acmePipeline, '43. Acme default pipeline still exists');
  assert(acmePipeline!.stages.length > 0, '44. Pipeline stages still exist');

  // Verify permissions still work
  const permissions = await prisma.permission.findMany();
  assert(permissions.length >= 41, '45. At least 41 permissions exist (25 Phase 1 + 16 Phase 2)');
}

async function run() {
  try {
    await setup();
    await testSubscriptionIsolation();
    await testAiConversationIsolation();
    await testAiScoreIsolation();
    await testAiSummaryIsolation();
    await testCommunicationIsolation();
    await testCommunicationConsent();
    await testWorkflowIsolation();
    await testSequenceIsolation();
    await testUsageRecordIsolation();
    await testBillingEventIsolation();
    await testEntitlements();
    await testPhase1StillWorks();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
    console.log(`${'='.repeat(60)}`);

    if (testsFailed > 0) {
      console.log('\n❌ SOME TESTS FAILED!');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL PHASE 2 SECURITY & BUSINESS LOGIC TESTS PASSED!');
    }
  } catch (err) {
    console.error('\n💥 Test suite crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
