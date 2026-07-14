import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { 
  OCR_SYSTEM_PROMPT, 
  DOCUMENT_OCR_FULL_PROMPT,
  RISK_RECOMMENDATION_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  ASSISTANT_SYSTEM_PROMPT 
} from './prompts';
import { env } from '../config/environment';

export class AIService {
  private apiKey = env.OPENAI_API_KEY || '';

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    mediaUrl?: string,
    asJson = true
  ): Promise<string> {
    if (!this.apiKey) {
      logger.warn('OPENAI_API_KEY environment variable is not set. Returning mock fallback data.');
      return ''; // Trigger fallback block in caller
    }

    try {
      const contentPayload: any[] = [{ type: 'text', text: userPrompt }];

      if (mediaUrl) {
        contentPayload.push({
          type: 'image_url',
          image_url: { url: mediaUrl }
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contentPayload }
          ],
          temperature: 0.1,
          response_format: asJson ? { type: 'json_object' } : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json() as any;
      return result.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('Error contacting OpenAI Chat Completions endpoint', error);
      throw error;
    }
  }

  // ----------------------------------------------------------------------------------
  // Full multi-field document OCR (Prescription, Bill, Discharge Summary, Report)
  // ----------------------------------------------------------------------------------
  async analyzeDocument(fileUrl: string, documentType?: string): Promise<any> {
    logger.info(`Full OCR analysis for doc type: ${documentType || 'auto'}, URL: ${fileUrl}`);

    const userPrompt = `Document Type Hint: ${documentType || 'auto-detect'}. Analyze this medical document and extract all fields.`;
    const rawText = await this.callOpenAI(DOCUMENT_OCR_FULL_PROMPT, userPrompt, fileUrl, true);

    if (!rawText) {
      // Comprehensive fallback mock for dev/testing
      return {
        document_type: documentType || 'Bill',
        hospital_name: 'City General Hospital',
        doctor_name: 'Dr. Meera Sen',
        patient_name: 'Ramesh Kumar',
        bill_number: 'INV-2026-8802',
        bill_date: new Date().toISOString().split('T')[0],
        admission_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        discharge_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        diagnosis: 'Acute Febrile Illness with Dehydration — requiring IV fluid therapy and observation.',
        medicines: ['Amoxicillin 500mg', 'Paracetamol 650mg', 'Pantoprazole 40mg'],
        total_amount: 14500.00,
        line_items: [
          { description: 'Room Rent - General Ward (5 days)', category: 'Room Rent', amount: 5000 },
          { description: 'IV Fluid Therapy', category: 'Medicines', amount: 1200 },
          { description: 'Doctor Consultation Fee', category: 'Consultation', amount: 800 },
          { description: 'CBC / Blood Culture / LFT', category: 'Lab Diagnostics', amount: 3500 },
          { description: 'Medicines & Pharmacy', category: 'Medicines', amount: 4000 }
        ],
        confidence_notes: 'Mock data — OpenAI API key not configured.'
      };
    }

    try {
      return JSON.parse(rawText);
    } catch {
      logger.error('Failed to parse OCR JSON response', rawText);
      throw new Error('AI returned malformed JSON. Please try again.');
    }
  }

  // ----------------------------------------------------------------------------------
  // Basic invoice extraction (existing — kept for backward compatibility)
  // ----------------------------------------------------------------------------------
  async extractInvoiceFromDocument(fileUrl: string): Promise<any> {
    logger.info(`Extracting invoice parameters from file URL: ${fileUrl}`);

    const userPrompt = 'Analyze this medical receipt and return the extracted JSON.';
    const ocrResponseText = await this.callOpenAI(OCR_SYSTEM_PROMPT, userPrompt, fileUrl);

    if (!ocrResponseText) {
      return {
        invoice_number: 'INV-2026-8802',
        invoice_date: new Date().toISOString().split('T')[0],
        hospital_name: 'City General Hospital',
        total_amount: 1500.00,
        line_items: [
          { description: 'Room Rent Consultation Ward', quantity: 1, unit_price: 1000.00, total_price: 1000.00 },
          { description: 'Antibiotics & IV Fluids', quantity: 1, unit_price: 500.00, total_price: 500.00 }
        ]
      };
    }

    return JSON.parse(ocrResponseText);
  }

  // ----------------------------------------------------------------------------------
  // AI Risk Recommendation generation
  // ----------------------------------------------------------------------------------
  async generateRiskRecommendation(auditResult: {
    claim_number: string;
    risk_score: string;
    duplicate_detected: boolean;
    mismatch_detected: boolean;
    missing_documents: string[];
    total_claimed: number;
    hospital_name: string;
    diagnosis: string;
    details: any;
  }): Promise<{ recommendation: string; key_flags: string[]; advisory: string }> {
    logger.info(`Generating risk recommendation for claim: ${auditResult.claim_number}`);

    const userPrompt = `
Audit Results for Claim ${auditResult.claim_number}:
- Risk Score: ${auditResult.risk_score}
- Hospital: ${auditResult.hospital_name}
- Diagnosis: ${auditResult.diagnosis}
- Total Amount Claimed: INR ${auditResult.total_claimed}
- Duplicate Bill Detected: ${auditResult.duplicate_detected}
- Amount Mismatch Detected: ${auditResult.mismatch_detected}
- Missing Required Documents: ${auditResult.missing_documents.length > 0 ? auditResult.missing_documents.join(', ') : 'None'}
- Audit Details: ${JSON.stringify(auditResult.details)}

Generate the officer recommendation JSON now.
`;

    const rawText = await this.callOpenAI(RISK_RECOMMENDATION_PROMPT, userPrompt, undefined, true);

    if (!rawText) {
      // Fallback recommendations
      const flags: string[] = [];
      if (auditResult.duplicate_detected) flags.push('Duplicate document hash detected across multiple claims — verify original invoices.');
      if (auditResult.mismatch_detected) flags.push(`Total amount claimed does not match sum of bill line items — request reconciliation.`);
      if (auditResult.missing_documents.length > 0) flags.push(`Missing required documents: ${auditResult.missing_documents.join(', ')}.`);

      return {
        recommendation: flags.length === 0
          ? `Claim ${auditResult.claim_number} appears to be in order based on automated checks. The officer should verify the diagnosis and ensure all original documents are physically present before final approval.`
          : `Automated audit detected ${flags.length} issue(s) in claim ${auditResult.claim_number}. The officer is advised to conduct a manual verification before processing. ${flags.join(' ')}`,
        key_flags: flags.length > 0 ? flags : ['No automated flags detected. Standard due diligence applies.'],
        advisory: 'AI recommends further review. The Medical Officer holds the final authority to approve or reject this claim.'
      };
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return {
        recommendation: rawText,
        key_flags: [],
        advisory: 'AI recommendation generated. Medical Officer must make the final decision.'
      };
    }
  }

  // ----------------------------------------------------------------------------------
  // Full orchestrated analysis pipeline
  // ----------------------------------------------------------------------------------
  async runFullAnalysis(claimId: string): Promise<any> {
    logger.info(`Running full AI analysis pipeline for claim: ${claimId}`);

    // 1. Run the base security audit
    const auditData = await this.runSecurityAudit(claimId);

    // 2. Fetch claim for context
    const { data: claim } = await supabaseAdmin
      .from('claims')
      .select('*, hospitals(*)')
      .eq('id', claimId)
      .single();

    // 3. Generate AI risk recommendation
    const recommendationResult = await this.generateRiskRecommendation({
      claim_number: claim?.claim_number || claimId,
      risk_score: auditData.risk_score,
      duplicate_detected: auditData.duplicate_detected,
      mismatch_detected: auditData.mismatch_detected,
      missing_documents: auditData.missing_documents || [],
      total_claimed: Number(claim?.total_amount_claimed || 0),
      hospital_name: claim?.hospitals?.name || 'Unknown Hospital',
      diagnosis: claim?.diagnosis || 'Not specified',
      details: auditData.details || {}
    });

    // 4. Upsert enriched result back to ai_analysis
    const { data: enriched, error } = await supabaseAdmin
      .from('ai_analysis')
      .upsert([{
        claim_id: claimId,
        risk_score: auditData.risk_score,
        duplicate_detected: auditData.duplicate_detected,
        mismatch_detected: auditData.mismatch_detected,
        missing_documents: auditData.missing_documents,
        analysis_summary: auditData.analysis_summary,
        ai_recommendation: recommendationResult.recommendation,
        details: {
          ...auditData.details,
          key_flags: recommendationResult.key_flags,
          advisory: recommendationResult.advisory
        }
      }], { onConflict: 'claim_id' })
      .select()
      .single();

    if (error) {
      logger.error(`Failed to upsert full analysis for claim ${claimId}`, error);
      throw error;
    }

    return enriched;
  }

  // ----------------------------------------------------------------------------------
  // Claim Summary via GPT
  // ----------------------------------------------------------------------------------
  async generateClaimSummary(claimDetails: any): Promise<string> {
    logger.info(`Generating executive summary for claim ID: ${claimDetails.id}`);

    const userPrompt = `
Claim Metadata:
- Claim Number: ${claimDetails.claim_number}
- Patient Category: ${claimDetails.patient_type}
- Diagnostic Text: ${claimDetails.diagnosis || 'N/A'}
- Hospital: ${claimDetails.hospitals?.name || 'N/A'} (Empanelled: ${claimDetails.hospitals?.is_empanelled})
- Claim Type: ${claimDetails.claim_type}
- Total Amount Claimed: INR ${claimDetails.total_amount_claimed}

Bill Line Items:
${JSON.stringify(claimDetails.bill_items || [])}
`;

    const summaryText = await this.callOpenAI(SUMMARY_SYSTEM_PROMPT, userPrompt, undefined, false);
    
    if (!summaryText) {
      return `This is a clinical medical claim submitted for patient treatment (Category: ${claimDetails.patient_type}) at ${claimDetails.hospitals?.name || 'the hospital'}. Total claimed expenditure is INR ${claimDetails.total_amount_claimed} for treating ${claimDetails.diagnosis || 'clinical diagnostics'}.`;
    }

    return summaryText.trim();
  }

  // ----------------------------------------------------------------------------------
  // Security audit engine (existing — kept intact)
  // ----------------------------------------------------------------------------------
  async runSecurityAudit(claimId: string): Promise<any> {
    logger.info(`Starting system-wide AI security audit check for claim ${claimId}`);

    try {
      const { data: claim, error: claimError } = await supabaseAdmin
        .from('claims')
        .select(`*, hospitals (*), claim_documents (*), claim_bill_items (*)`)
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        throw new Error(`Claim not found for audit: ${claimError?.message}`);
      }

      // Duplicate detection via file hash
      let duplicateDetected = false;
      const docHashes = claim.claim_documents.map((d: any) => d.file_hash).filter(Boolean);
      if (docHashes.length > 0) {
        const { data: duplicateDocs } = await supabaseAdmin
          .from('claim_documents')
          .select('claim_id')
          .in('file_hash', docHashes)
          .neq('claim_id', claimId);

        if (duplicateDocs && duplicateDocs.length > 0) {
          duplicateDetected = true;
        }
      }

      // Amount mismatch check
      const totalClaimedInput = Number(claim.total_amount_claimed);
      const billsSum = claim.claim_bill_items.reduce((sum: number, item: any) => sum + Number(item.amount_claimed), 0);
      const mismatchDetected = Math.abs(totalClaimedInput - billsSum) > 1.00;

      // Date mismatch check (bill dates outside admission-discharge range)
      let dateMismatchDetected = false;
      if (claim.admission_date && claim.discharge_date) {
        const admDate = new Date(claim.admission_date);
        const disDate = new Date(claim.discharge_date);
        dateMismatchDetected = claim.claim_bill_items.some((item: any) => {
          if (!item.bill_date) return false;
          const bd = new Date(item.bill_date);
          return bd < admDate || bd > disDate;
        });
      }

      // Missing documents check
      const docCategories = claim.claim_documents.map((d: any) => d.category);
      const missingDocs: string[] = [];
      if (claim.claim_type === 'IPD') {
        if (!docCategories.includes('Discharge Summary')) missingDocs.push('Discharge Summary');
        if (!docCategories.includes('Invoice Receipt')) missingDocs.push('Invoice Receipt');
        if (!docCategories.includes('Identity Proof')) missingDocs.push('Identity Proof');
      } else {
        if (!docCategories.includes('Prescription')) missingDocs.push('Prescription');
        if (!docCategories.includes('Invoice Receipt')) missingDocs.push('Invoice Receipt');
      }

      // Risk scoring
      let scorePoints = 0;
      if (duplicateDetected) scorePoints += 100;
      if (mismatchDetected) scorePoints += 30;
      if (dateMismatchDetected) scorePoints += 25;
      if (missingDocs.length > 0) scorePoints += 40;
      if (claim.hospitals && !claim.hospitals.is_empanelled) scorePoints += 50;

      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      if (scorePoints >= 50) riskLevel = 'High';
      else if (scorePoints > 10) riskLevel = 'Medium';

      // GPT summary
      const summaryText = await this.generateClaimSummary(claim);

      const analysisData = {
        claim_id: claimId,
        risk_score: riskLevel,
        duplicate_detected: duplicateDetected,
        mismatch_detected: mismatchDetected,
        missing_documents: missingDocs,
        analysis_summary: summaryText,
        details: {
          duplicate_scans: { checked_hashes_count: docHashes.length, duplicate_found: duplicateDetected },
          amounts_scans: { inputted_total: totalClaimedInput, bill_items_sum: billsSum, mismatch_found: mismatchDetected },
          date_mismatch: { detected: dateMismatchDetected, admission_date: claim.admission_date, discharge_date: claim.discharge_date },
          score_points: scorePoints,
          audited_at: new Date().toISOString()
        }
      };

      const { data, error } = await supabaseAdmin
        .from('ai_analysis')
        .upsert([analysisData], { onConflict: 'claim_id' })
        .select()
        .single();

      if (error) {
        logger.error(`Failed inserting analysis logs for claim ${claimId}`, error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`AI Security Audit failed for claim ${claimId}`, error);
      throw error;
    }
  }

  // ----------------------------------------------------------------------------------
  // Officer AI Assistant Q&A
  // ----------------------------------------------------------------------------------
  async askOfficerAssistant(claimId: string, question: string): Promise<string> {
    logger.info(`Officer asking assistant about claim ${claimId}: "${question}"`);

    const { data: claim } = await supabaseAdmin
      .from('claims')
      .select(`*, hospitals (*), claim_documents (*), claim_bill_items (*), ai_analysis (*)`)
      .eq('id', claimId)
      .single();

    if (!claim) {
      throw new Error(`Claim not found for ID: ${claimId}`);
    }

    const { data: rates } = await supabaseAdmin
      .from('cghs_rates')
      .select('*')
      .limit(20);

    const userPrompt = `
Claim Details Context:
- ID: ${claim.id}
- Claim Number: ${claim.claim_number}
- Diagnosis: ${claim.diagnosis || 'N/A'}
- Total Amount: INR ${claim.total_amount_claimed}
- Hospital Empanelled Status: ${claim.hospitals?.name} (Empanelled: ${claim.hospitals?.is_empanelled})
- AI Risk Evaluation: Score Level is ${claim.ai_analysis?.risk_score || 'N/A'}. Details: ${claim.ai_analysis?.analysis_summary}
- Items: ${JSON.stringify(claim.claim_bill_items || [])}

CGHS Guidelines Reference:
${JSON.stringify(rates || [])}

Officer Query:
"${question}"
`;

    const responseText = await this.callOpenAI(ASSISTANT_SYSTEM_PROMPT, userPrompt, undefined, false);
    
    if (!responseText) {
      return `Hello, Officer. I cannot access the OpenAI API right now. Based on the local claim details, I notice the hospital empanelled state is ${claim.hospitals?.is_empanelled ? 'Empanelled' : 'Non-Empanelled'} and the total claimed amount is INR ${claim.total_amount_claimed}. Please let me know how I can guide you further.`;
    }

    return responseText;
  }
}
