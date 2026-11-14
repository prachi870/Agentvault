# Agentvault User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Knowledge Library](#knowledge-library)
4. [Knowledge Updates](#knowledge-updates)
5. [Using the Chat Interface](#using-the-chat-interface)
6. [Understanding Responses](#understanding-responses)
7. [Audit Receipts](#audit-receipts)
8. [User Profile](#user-profile)
9. [Admin Features](#admin-features)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Introduction

**Agentvault** is an AI-powered enterprise knowledge workspace that provides cited answers by searching across your organization's connected data sources.

### Key Features
- **🔍 Multi-source Search**: Queries across all connected enterprise data sources
- **✅ Claim Verification**: Every response is fact-checked against source documents
- **📎 Inline Citations**: All claims are backed by specific source references
- **🛡️ RBAC Security**: Role-based access control ensures you only see authorized information
- **🧾 Audit Receipts**: Every response generates a cryptographically signed audit trail
- **⚡ Real-time Streaming**: Watch as the system searches, verifies, and generates answers

---

## Getting Started

### Creating Your Account

**For Employees:**
1. Navigate to the signup page at `/signup`
2. Fill in your details:
   - Full Name
   - Email Address
   - Password (minimum 8 characters)
3. Click "Sign Up"
4. Your account will be created with default employee privileges
5. Contact your administrator if you need elevated access

**For Admins:**
- Admin accounts are created by existing administrators through the User Management panel
- The initial admin account is created during system bootstrap

### Logging In

1. Go to the login page at `/login`
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to the dashboard

### Your Dashboard

After logging in, you'll see:
- **Chat**: Ask questions and get AI-powered answers
- **Receipts**: View audit history of all your queries
- **Profile**: View and manage your account details
- **User Management** (Admin only): Manage users and permissions

---

## Knowledge Library

Managers and administrators can open **Knowledge library** from the sidebar and add documents. The built-in **Load sample library** action adds four clearly labeled, fictional internal documents covering leave, travel expenses, security incidents, and customer-support escalations. It uses the normal indexing pipeline and is safe to retry without creating duplicates. Sample policies are for testing only, not real company guidance.

Individual uploads support PDF, TXT, MD/MARKDOWN, HTML/HTM, CSV, JSON, LOG, RST, DOCX, and PPTX files up to 25 MB. XLS/XLSX is not supported. Scanned-PDF OCR and PPTX parsing may require the optional parser dependencies described in `backend/requirements-parsers.txt`.

When adding real documents, choose the correct classification and allowed roles so only authorized people can retrieve their contents.

---

## Knowledge Updates

Open **Knowledge updates** in the sidebar to review recently indexed sources and content revisions. Choose a 7-, 30-, or 90-day window. Each entry links to the current source and indicates whether it was added or revised; revision entries also show how many earlier answers cited the previous version. The feed only includes documents the signed-in user can currently access. History starts when a source is indexed or revised with version tracking enabled; older changes are not backfilled.

---

## Using the Chat Interface

### Asking Questions

1. Navigate to the **Chat** page
2. Type your question in the input field at the bottom
3. Press **Enter** or click the send button (→)
4. Watch as the system processes your query in real-time

**Tips for Effective Questions:**
- Be specific: "What is our Q4 2024 revenue target for EMEA?" vs "What are our targets?"
- Include context: "According to the latest product roadmap, when will Feature X launch?"
- Use proper terminology: Use domain-specific terms your organization uses
- Break down complex questions: Ask one thing at a time for clearer answers
- Ask follow-ups such as “what else?” in the same chat; the system uses the latest answered turn’s cited document titles and skips its already-cited chunks when searching for additional evidence. New, unrelated questions do not inherit that context.

### Progress Stages

As your question is processed, you'll see progress through these stages:

1. **🔍 Retrieving**: Searching across connected data sources
2. **📋 Planning**: Creating a verification plan
3. **✅ Verifying**: Checking claims against evidence
4. **✍️ Generating**: Composing the final answer

### Choosing an Answer Style

Select an answer style above the chat composer:
- **Quick** prioritizes a short answer with the key evidence.
- **Detailed** includes more distinct evidence points.
- **Decision brief** asks for a concise, decision-oriented structure when a generative model is configured. The offline extractive model remains evidence-focused and does not invent recommendations.

The selected style is shown with each response and recorded in its audit receipt.

### Answer Feedback

After an answered or abstained response, use **Yes** or **Not quite** to rate it. For an unhelpful response, choose a reason (incorrect, missing detail, wrong source, outdated, or other) and optionally add a short note. Feedback is tied to that answer’s receipt; you can update your rating later. Blocked requests do not accept answer feedback.

Managers and administrators can review feedback from **Answer feedback** in the sidebar. The queue shows the question, answer, cited source titles, confidence, and grounding without showing the submitter’s name or email. Managers see items from their department only when cited documents are within their own access; administrators can review all workspace feedback. Mark an item reviewed when it has been triaged; a user’s later update returns it to the open queue.

### Saved Conversations

Completed chat turns are saved automatically under **Saved conversations** in the sidebar. Reopen a conversation to restore its questions, answers, and citations; rename or remove it from your history when needed. Conversations are private to your account. Removing one hides it from history, while its signed audit receipts remain in the Evidence Ledger.

---

## Understanding Responses

### Response Components

Each answer includes:

**1. Answer Text**
- The main response to your question
- Includes inline citation markers like [1], [2], [3]
- Click citation markers to jump to source documents

**2. Confidence Score**
- **High**: Strong evidence supports the answer
- **Medium**: Moderate evidence, some uncertainty
- **Low**: Limited or conflicting evidence

**3. Grounding Percentage**
- Shows what % of the answer is supported by retrieved documents
- Higher grounding = more factual, less speculative

**4. Citations**
- List of source documents used
- Each citation includes:
  - Document title and metadata
  - Relevant excerpt
  - Classification level
  - Direct link (if available)

**5. Audit Receipt**
- Unique receipt ID for this response
- Click to view full audit details

### Response Status

- **✅ ANSWERED**: Question successfully answered
- **🚫 BLOCKED**: Access denied - insufficient clearance level
- **❌ UNANSWERED**: No relevant information found
- **⚠️ UNVERIFIABLE**: Claims could not be verified against sources
- **❓ AMBIGUOUS**: Question too vague - rephrase for better results

---

## Audit Receipts

### What are Receipts?

Every AI response generates an immutable audit receipt that includes:
- Unique receipt ID
- Timestamp
- User who asked the question
- Complete question text
- Full response with all citations
- Confidence and grounding scores
- SHA-256 cryptographic signature

### Viewing Receipts

1. Navigate to the **Receipts** page
2. Browse all your past queries
3. Use filters to find specific receipts:
   - Date range
   - Status (answered, blocked, etc.)
   - Confidence level
4. Click any receipt to view full details

### Verifying Receipts

To verify a receipt hasn't been tampered with:
1. Open the receipt details
2. Check the signature hash
3. The system automatically validates integrity
4. Any tampering will be flagged immediately

### Use Cases

- **Compliance Audits**: Prove what information was shared and when
- **Quality Assurance**: Review system accuracy over time
- **Training**: Collect examples for improving the system
- **Dispute Resolution**: Verify what the system actually said
- **Performance Monitoring**: Track response quality metrics

---

## User Profile

### Viewing Your Profile

Navigate to **Profile** in the sidebar to see:
- Full name
- Email address
- Role (admin or employee)
- Clearance level (0-3)
- Account creation date
- Account status

### Clearance Levels

Your clearance level determines what documents you can access:

- **Level 0 (Public)**: Public information only
- **Level 1 (Internal)**: Public + internal company information
- **Level 2 (Confidential)**: Public + internal + confidential information
- **Level 3 (Restricted)**: All information including restricted data

**Note**: Only administrators can change clearance levels. Contact your admin if you need elevated access.

---

## Admin Features

*This section applies only to users with admin role.*

### User Management

Navigate to **User Management** to:

**View All Users**
- See all registered users
- View role, clearance, and status for each user
- Search and filter users

**Edit Users**
1. Click "Edit" next to any user
2. Update role (admin/employee)
3. Update clearance level (0-3)
4. Save changes

**Deactivate/Reactivate Users**
1. Click "Deactivate" to disable a user account
2. Deactivated users cannot log in
3. Click "Reactivate" to restore access

### Knowledge Quality Workflows

Managers and admins can use two dashboard pages to improve source quality:

- **Evidence Changes** shows updated connector sources and the number of earlier answered receipts that cited the prior revision. Treat the count as a review prompt, not proof that an answer is incorrect. Revision history starts when tracking is enabled.
- **Knowledge Gaps** lists unanswered or low-confidence topics. Open a gap's follow-up form to set an owner, a concrete next step, and its work status. A later successful answer matching the gap marks its follow-up verified.

### RAG Evaluation

Administrators can open **RAG evaluation** from the sidebar to create a private test suite for retrieval and answer quality. Each case includes a realistic user question, one or more expected indexed source documents, and optional required answer phrases. Run an individual case or the whole suite; a case passes only when the system answers, cites every expected source, and includes every required phrase. Cases can be edited or deleted.

Runs use the configured embedding and language models and may incur provider costs. They do not create user receipts, update saved conversations, or change knowledge-gap analytics. The latest score summary is saved with each case; the generated answer is shown for the current run but is not retained as evaluation history. A workspace can store up to 50 cases.

### Best Practices for Admins

- **Principle of Least Privilege**: Give users the minimum clearance they need
- **Regular Audits**: Review user permissions quarterly
- **Deactivate Promptly**: Disable accounts immediately when users leave
- **Monitor Receipts**: Review blocked queries to identify access issues
- **Document Changes**: Keep a log of permission changes for compliance

---

## Troubleshooting

### Common Issues and Solutions

#### "Access Denied" or "BLOCKED" Status

**Problem**: Your clearance level is insufficient for the requested information.

**Solutions**:
- Check if the question requires higher clearance
- Contact your administrator to request elevated access
- Rephrase the question to avoid restricted topics
- Verify you're logged in with the correct account

#### "No documents found" or "UNANSWERED"

**Problem**: The system couldn't find relevant information.

**Solutions**:
- Try rephrasing your question with different keywords
- Check if the relevant data source is connected
- Verify the information exists in your knowledge base
- Ask your admin to upload relevant documents
- Break complex questions into simpler parts

#### Low Confidence Scores

**Problem**: The system found limited or conflicting evidence.

**Solutions**:
- Review citations to understand the evidence
- Ask a more specific question
- Verify if source documents are up-to-date
- Cross-reference with multiple queries
- Consider that the information may genuinely be uncertain

#### Slow or Timeout Responses

**Problem**: Query takes too long to process.

**Solutions**:
- Break complex questions into smaller parts
- Simplify your question
- Try during off-peak hours
- Contact your admin if timeouts persist

#### Login Issues

**Problem**: Cannot log in to your account.

**Solutions**:
- Verify email and password are correct
- Check if account has been deactivated (contact admin)
- Clear browser cache and cookies
- Try a different browser
- Reset your password (if feature is enabled)

---

## Best Practices

### For All Users

**Ask Better Questions**
- Be specific and detailed
- Include relevant context
- Use proper terminology
- One question at a time
- Specify time ranges when relevant

**Review Responses Carefully**
- Check confidence scores
- Read all citations
- Verify critical information
- Report inaccurate responses

**Maintain Security**
- Don't share your credentials
- Log out when finished
- Don't screenshot sensitive information
- Report suspicious activity

### For Administrators

**User Management**
- Follow least privilege principle
- Audit permissions regularly
- Document all changes
- Respond promptly to access requests

**System Monitoring**
- Review audit receipts regularly
- Monitor blocked queries
- Track system performance
- Address user issues quickly

**Data Management**
- Keep data sources up-to-date
- Remove outdated information
- Verify connector configurations
- Test access controls regularly

---

## Getting Help

### In-App Help

Click the **?** icon in any page header to access context-sensitive help.

### Contact Support

- **Technical Issues**: Contact your system administrator
- **Access Requests**: Use your organization's access request process
- **Bug Reports**: Report through your internal ticketing system
- **Feature Requests**: Submit through your organization's feedback channels

### Documentation

- **Full Documentation**: See the main README.md
- **API Documentation**: Available at `/docs` (for developers)
- **Admin Guide**: Available in ADMIN_GUIDE.md

---

## Appendix: Keyboard Shortcuts

- **Enter**: Send message in chat
- **Shift + Enter**: New line in chat
- **Esc**: Close modal dialogs
- **Ctrl/Cmd + K**: Quick search (if enabled)

---

## Appendix: Glossary

**RBAC**: Role-Based Access Control - system for managing user permissions

**Clearance Level**: Numeric level (0-3) indicating what information you can access

**Grounding**: Percentage of answer supported by retrieved documents

**Confidence**: System's certainty level about the answer

**Citation**: Reference to source document supporting a claim

**Receipt**: Cryptographic audit record of an AI response

**Connector**: Integration with external data source

**Retrieval**: Process of searching for relevant documents

**Verification**: Process of checking claims against evidence

---

*Last Updated: 2026-09-28*
*Version: 1.0*
