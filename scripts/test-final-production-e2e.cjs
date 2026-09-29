// scripts/test-final-production-e2e.cjs
// Comprehensive live end-to-end production verification test for KaushalSetu

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cgtfssoevnkoyesbokeu.supabase.co';
const ANON_KEY = 'sb_publishable_avG-ZDcKwoAAuiOd2lOknQ_cttTIr9T';

const ROLES = {
  TRAINEE: { email: 'trainee@kaushalsetu.gov.in', password: 'Password@123' },
  EMPLOYER: { email: 'employer@tata.example.com', password: 'Password@123' },
  PROVIDER: { email: 'provider@centurion.example.com', password: 'Password@123' },
  GOVERNMENT: { email: 'gov@msde.gov.in', password: 'Password@123' },
};

function createAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const results = [];

function recordTest(area, testName, passed, details = '') {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${area}] ${testName} ${details ? '— ' + details : ''}`);
  results.push({ area, testName, passed, details });
}

async function runTests() {
  console.log('============================================================');
  console.log('KAUSHALSETU — LIVE PRODUCTION VERIFICATION SUITE');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & SESSION TESTS (ALL 4 STAKEHOLDERS)
  // -------------------------------------------------------------------------
  console.log('--- 1. AUTHENTICATION & PROFILE RESOLUTION ---');

  for (const [roleName, creds] of Object.entries(ROLES)) {
    const sb = createAnonClient();
    const { data: auth, error: aErr } = await sb.auth.signInWithPassword(creds);
    if (aErr || !auth.user) {
      recordTest('Auth', `${roleName} Login`, false, aErr?.message);
      continue;
    }
    recordTest('Auth', `${roleName} Login`, true, `UID: ${auth.user.id}`);

    // Session resolution
    const { data: sessionData, error: sErr } = await sb.auth.getSession();
    recordTest('Auth', `${roleName} Session Retrieval`, Boolean(sessionData?.session), sErr?.message || '');

    // User Profile in PostgreSQL
    const { data: profile, error: pErr } = await sb.from('profiles').select('id, name, email, role').eq('id', auth.user.id).single();
    const roleMatches = profile && (
      (roleName === 'TRAINEE' && profile.role === 'TRAINEE') ||
      (roleName === 'EMPLOYER' && profile.role === 'EMPLOYER') ||
      (roleName === 'PROVIDER' && profile.role === 'TRAINING_PROVIDER') ||
      (roleName === 'GOVERNMENT' && profile.role === 'GOVERNMENT')
    );
    recordTest('Auth', `${roleName} Profile Resolution`, Boolean(roleMatches), `Role in DB: ${profile?.role}`);
  }

  // -------------------------------------------------------------------------
  // 2. COMPLETE CROSS-STAKEHOLDER WORKFLOW (PARTS 4, 6, 7, 8, 26)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. COMPLETE CROSS-STAKEHOLDER DATA FLOW ---');

  // Step A: Trainee reports employment
  const traineeClient = createAnonClient();
  await traineeClient.auth.signInWithPassword(ROLES.TRAINEE);

  const testSalary = 28000;
  const testJobTitle = 'Industrial Automation Specialist';
  const testEmployer = 'Tata Motors Ancillary Ltd.';
  const testStartDate = '2026-09-29';

  const { data: commitRes, error: commitErr } = await traineeClient.rpc('record_trainee_employment_update', {
    p_data: {
      trainee_id: 'tr_priya',
      status: 'EMPLOYED',
      job_title: testJobTitle,
      employer_name: testEmployer,
      employment_type: 'REGULAR',
      monthly_salary: testSalary,
      start_date: testStartDate,
      district: 'Pune',
      state: 'Maharashtra',
      notes: 'Final production verification outcome submission.'
    }
  });

  const commitPassed = !commitErr && commitRes?.success;
  recordTest('Trainee', 'Commit Employment Outcome', commitPassed, commitErr?.message || `Status: ${commitRes?.status}`);

  // Refetch trainee dossier immediately
  const { data: traineeDossier, error: dossierErr } = await traineeClient.rpc('get_trainee_dossier', { p_id: 'me' });
  const activeEmpMatches = traineeDossier?.activeEmployment?.jobTitle === testJobTitle &&
                           traineeDossier?.activeEmployment?.monthlySalary === testSalary;
  recordTest('Trainee', 'Immediate Dossier State Sync', Boolean(activeEmpMatches), `Job: ${traineeDossier?.activeEmployment?.jobTitle}, Wage: ₹${traineeDossier?.activeEmployment?.monthlySalary}`);

  // Step B: Employer logs in and inspects candidate roster
  const employerClient = createAnonClient();
  await employerClient.auth.signInWithPassword(ROLES.EMPLOYER);

  const { data: candsData, error: candsErr } = await employerClient.rpc('get_employer_candidates', { p_employer_id: 'default' });
  const candidateRecord = candsData?.data?.find(c => c.traineeId === 'tr_priya');
  recordTest('Employer', 'Candidate Roster Visibility', Boolean(candidateRecord), `Found candidate: ${candidateRecord?.name}, Role: ${candidateRecord?.role}`);

  // Step C: Employer validates candidate employment
  const { data: valRes, error: valErr } = await employerClient.rpc('validate_candidate_employment', {
    p_data: {
      candidateId: 'tr_priya',
      employmentRecordId: candidateRecord?.employmentRecordId,
      status: 'VERIFIED',
      notes: 'Validated by Tata Motors Ancillary Ltd. during final E2E test.'
    }
  });
  const valPassed = !valErr && valRes?.success && valRes?.validationStatus === 'VERIFIED';
  recordTest('Employer', 'Validate Candidate Employment Mutation', Boolean(valPassed), valErr?.message || `Record: ${valRes?.employmentRecordId}`);

  // Step D: Verify candidate status in employer roster is now VERIFIED
  const { data: updatedCands } = await employerClient.rpc('get_employer_candidates', { p_employer_id: 'default' });
  const updatedCandidate = updatedCands?.data?.find(c => c.traineeId === 'tr_priya');
  const rosterStatusVerified = updatedCandidate?.validationStatus === 'VERIFIED';
  recordTest('Employer', 'Roster Reflects VERIFIED Status', Boolean(rosterStatusVerified), `Status: ${updatedCandidate?.validationStatus}`);

  // Step E: Trainee sees "Validated by employer"
  const { data: reloadedDossier } = await traineeClient.rpc('get_trainee_dossier', { p_id: 'me' });
  const traineeValidated = reloadedDossier?.activeEmployment?.validationStatus === 'VERIFIED';
  recordTest('Trainee', 'Dossier Reflects Employer Validated Status', Boolean(traineeValidated), `activeEmployment.validationStatus: ${reloadedDossier?.activeEmployment?.validationStatus}`);

  // Step F: Training Provider outcome intelligence
  const providerClient = createAnonClient();
  await providerClient.auth.signInWithPassword(ROLES.PROVIDER);

  const { data: providerIntel, error: provErr } = await providerClient.rpc('get_provider_outcome_intelligence', {
    p_provider_id: 'centurion',
    p_time_range: 'all'
  });
  const provPassed = !provErr && providerIntel?.provider?.name && providerIntel?.trainees?.length > 0;
  recordTest('Provider', 'Provider Outcome Intelligence Loaded', Boolean(provPassed), provErr?.message || `Provider: ${providerIntel?.provider?.name}, Trainees: ${providerIntel?.trainees?.length}`);

  // Step G: Government outcome intelligence
  const govClient = createAnonClient();
  await govClient.auth.signInWithPassword(ROLES.GOVERNMENT);

  const { data: govIntel, error: govErr } = await govClient.rpc('get_government_outcome_intelligence', {
    p_time_range: 'all',
    p_district: null,
    p_programme: null,
    p_provider: null,
    p_data_quality: 'all'
  });
  const govPassed = !govErr && govIntel?.kpis && Array.isArray(govIntel?.districts) && Array.isArray(govIntel?.providers);
  recordTest('Government', 'Government Aggregated Intelligence Loaded', Boolean(govPassed), govErr?.message || `Districts: ${govIntel?.districts?.length}, Providers: ${govIntel?.providers?.length}, Placed: ${govIntel?.kpis?.employed}`);

  // -------------------------------------------------------------------------
  // 3. SECURITY & TENANT ISOLATION TESTS (PART 3, PART 13)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. HORIZONTAL & VERTICAL ACCESS CONTROL ISOLATION ---');

  // Test 1: Trainee attempting to access employer candidates
  const { data: trIlleg, error: trIllegErr } = await traineeClient.rpc('get_employer_candidates', { p_employer_id: 'emp_tata' });
  const traineeBlocked = Boolean(trIllegErr);
  recordTest('Security', 'Trainee Blocked from Employer Candidates', traineeBlocked, trIllegErr?.message);

  // Test 2: Employer attempting to access provider intelligence
  const { data: empIlleg, error: empIllegErr } = await employerClient.rpc('get_provider_outcome_intelligence', { p_provider_id: 'tp_centurion' });
  const employerBlocked = Boolean(empIllegErr);
  recordTest('Security', 'Employer Blocked from Provider Intelligence', employerBlocked, empIllegErr?.message);

  // Test 3: Training provider attempting to validate employer employment
  const { data: provIlleg, error: provIllegErr } = await providerClient.rpc('validate_candidate_employment', {
    p_data: { candidateId: 'tr_priya', status: 'VERIFIED' }
  });
  const providerBlocked = Boolean(provIllegErr);
  recordTest('Security', 'Provider Blocked from Employer Validation', providerBlocked, provIllegErr?.message);

  // -------------------------------------------------------------------------
  // SUMMARY MATRIX
  // -------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('PRODUCTION VERIFICATION MATRIX SUMMARY');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`TOTAL TESTS : ${total}`);
  console.log(`PASSED      : ${passed}`);
  console.log(`FAILED      : ${failed}`);
  console.log(`STATUS      : ${failed === 0 ? 'ALL PASS (ZERO KNOWN ERRORS)' : 'FAILURES DETECTED'}`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
