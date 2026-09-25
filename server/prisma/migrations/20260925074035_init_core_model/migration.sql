-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRAINEE', 'EMPLOYER', 'TRAINING_PROVIDER', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "GapSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "OutcomeType" AS ENUM ('EMPLOYED', 'UNEMPLOYED', 'UPSKILLED', 'NO_CHANGE');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('AADHAAR', 'EPFO');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "accreditationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernmentUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "aadhaarLinked" BOOLEAN NOT NULL DEFAULT false,
    "epfoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trainee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "trainingProviderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortEnrollment" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraineeCertification" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateNumber" TEXT NOT NULL,

    CONSTRAINT "TraineeCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAssessment" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "assessorType" TEXT NOT NULL,

    CONSTRAINT "SkillAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGap" (
    "id" TEXT NOT NULL,
    "skillAssessmentId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "severity" "GapSeverity" NOT NULL,

    CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "skillGapId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "InterventionStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "outcomeType" "OutcomeType" NOT NULL,
    "wageLiftPercent" DOUBLE PRECISION,
    "employerId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentRecord" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "monthlySalary" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EmploymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerFeedback" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedbackText" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProvider_userId_key" ON "TrainingProvider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProvider_accreditationId_key" ON "TrainingProvider"("accreditationId");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_userId_key" ON "Employer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentUser_userId_key" ON "GovernmentUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_userId_key" ON "Trainee"("userId");

-- CreateIndex
CREATE INDEX "Trainee_aadhaarLinked_idx" ON "Trainee"("aadhaarLinked");

-- CreateIndex
CREATE INDEX "Cohort_trainingProviderId_idx" ON "Cohort"("trainingProviderId");

-- CreateIndex
CREATE INDEX "CohortEnrollment_traineeId_idx" ON "CohortEnrollment"("traineeId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortEnrollment_cohortId_traineeId_key" ON "CohortEnrollment"("cohortId", "traineeId");

-- CreateIndex
CREATE INDEX "Certification_courseId_idx" ON "Certification"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeCertification_certificateNumber_key" ON "TraineeCertification"("certificateNumber");

-- CreateIndex
CREATE INDEX "TraineeCertification_certificationId_idx" ON "TraineeCertification"("certificationId");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeCertification_traineeId_certificationId_key" ON "TraineeCertification"("traineeId", "certificationId");

-- CreateIndex
CREATE INDEX "SkillAssessment_traineeId_idx" ON "SkillAssessment"("traineeId");

-- CreateIndex
CREATE INDEX "SkillGap_skillAssessmentId_idx" ON "SkillGap"("skillAssessmentId");

-- CreateIndex
CREATE INDEX "Intervention_skillGapId_idx" ON "Intervention"("skillGapId");

-- CreateIndex
CREATE INDEX "Outcome_interventionId_idx" ON "Outcome"("interventionId");

-- CreateIndex
CREATE INDEX "Outcome_employerId_idx" ON "Outcome"("employerId");

-- CreateIndex
CREATE INDEX "Insight_outcomeId_idx" ON "Insight"("outcomeId");

-- CreateIndex
CREATE INDEX "EmploymentRecord_traineeId_idx" ON "EmploymentRecord"("traineeId");

-- CreateIndex
CREATE INDEX "EmploymentRecord_employerId_idx" ON "EmploymentRecord"("employerId");

-- CreateIndex
CREATE INDEX "Verification_traineeId_idx" ON "Verification"("traineeId");

-- CreateIndex
CREATE INDEX "Verification_type_status_idx" ON "Verification"("type", "status");

-- CreateIndex
CREATE INDEX "FollowUp_traineeId_idx" ON "FollowUp"("traineeId");

-- CreateIndex
CREATE INDEX "EmployerFeedback_traineeId_idx" ON "EmployerFeedback"("traineeId");

-- CreateIndex
CREATE INDEX "EmployerFeedback_employerId_idx" ON "EmployerFeedback"("employerId");

-- AddForeignKey
ALTER TABLE "TrainingProvider" ADD CONSTRAINT "TrainingProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentUser" ADD CONSTRAINT "GovernmentUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainee" ADD CONSTRAINT "Trainee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_trainingProviderId_fkey" FOREIGN KEY ("trainingProviderId") REFERENCES "TrainingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeCertification" ADD CONSTRAINT "TraineeCertification_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeCertification" ADD CONSTRAINT "TraineeCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAssessment" ADD CONSTRAINT "SkillAssessment_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_skillAssessmentId_fkey" FOREIGN KEY ("skillAssessmentId") REFERENCES "SkillAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_skillGapId_fkey" FOREIGN KEY ("skillGapId") REFERENCES "SkillGap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentRecord" ADD CONSTRAINT "EmploymentRecord_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentRecord" ADD CONSTRAINT "EmploymentRecord_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerFeedback" ADD CONSTRAINT "EmployerFeedback_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerFeedback" ADD CONSTRAINT "EmployerFeedback_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
