import * as admin from "./admin";
import * as analytics from "./analytics";
import * as gbp from "./gbp";
import * as leads from "./leads";
import * as misc from "./misc";
import * as orgs from "./orgs";

export * from "./hooks";
export * from "./types";

class ApiClient {
  // ── Orgs ──

  static getOrgs = orgs.getOrgs;
  static getOrg = orgs.getOrg;
  static getOrgDetail = orgs.getOrgDetail;
  static getOrgActivity = orgs.getOrgActivity;
  static pauseOrg = orgs.pauseOrg;
  static resumeOrg = orgs.resumeOrg;
  static sendOrgMessage = orgs.sendOrgMessage;
  static createOrg = orgs.createOrg;
  static updateOrg = orgs.updateOrg;
  static getOrgDashboard = orgs.getOrgDashboard;

  // ── Leads ──

  static getLeads = leads.getLeads;
  static getLead = leads.getLead;
  static updateLead = leads.updateLead;

  // ── GBP ──

  static getGbpConnection = gbp.getGbpConnection;
  static getGbpInsights = gbp.getGbpInsights;
  static getGbpOAuthUrl = gbp.getGbpOAuthUrl;
  static getGbpPosts = gbp.getGbpPosts;
  static getGbpRankings = gbp.getGbpRankings;
  static getGbpCompetitors = gbp.getGbpCompetitors;
  static createGbpPost = gbp.createGbpPost;
  static syncGbp = gbp.syncGbp;
  static generateGbpPosts = gbp.generateGbpPosts;
  static generateImagePost = gbp.generateImagePost;
  static publishGbpPost = gbp.publishGbpPost;

  // ── Members (Clerk) ──

  static createMember = orgs.createMember;
  static getMemberByClerk = orgs.getMemberByClerk;

  // ── Analytics ──

  static getIntegrationHealth = analytics.getIntegrationHealth;
  static getAnalyticsSnapshot = analytics.getAnalyticsSnapshot;
  static getAdvancedInsights = analytics.getAdvancedInsights;
  static syncLiveAnalysis = analytics.syncLiveAnalysis;
  static runContentAgents = analytics.runContentAgents;
  static runAnalysisAndContent = analytics.runAnalysisAndContent;

  // ── Misc ──

  static seedDemoAccount = misc.seedDemoAccount;
  static generateReport = misc.generateReport;
  static checkTerritory = misc.checkTerritory;
  static claimTerritory = misc.claimTerritory;
  static getReports = misc.getReports;
  static getNotifications = misc.getNotifications;
  static trackEvent = misc.trackEvent;

  // ── Admin ──

  static getAdminIntelligence = admin.getAdminIntelligence;
  static getAdminDashboard = admin.getAdminDashboard;
  static getOnboardingFunnel = admin.getOnboardingFunnel;
  static getJourneyAnalytics = admin.getJourneyAnalytics;
  static getWorkflowInsights = admin.getWorkflowInsights;
  static getPilotStatus = admin.getPilotStatus;
  static getUserJourney = admin.getUserJourney;
}

export { ApiClient };
export default ApiClient;
