import * as admin from "./admin";
import * as analytics from "./analytics";
import * as gbp from "./gbp";
import * as leads from "./leads";
import * as misc from "./misc";
import * as orgs from "./orgs";
import * as seo from "./seo";

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
  static geocodeOrg = orgs.geocodeOrg;
  static getOrgSetup = orgs.getOrgSetup;
  static completeOnboarding = orgs.completeOnboarding;
  static listMyOrgs = orgs.listMyOrgs;
  static getOrgDashboard = orgs.getOrgDashboard;

  // ── Leads ──

  static getLeads = leads.getLeads;
  static getLead = leads.getLead;
  static updateLead = leads.updateLead;

  // ── GBP ──

  static getGbpConnection = gbp.getGbpConnection;
  static getGbpLocations = gbp.getGbpLocations;
  static selectGbpLocation = gbp.selectGbpLocation;
  static searchGbpPlaces = gbp.searchGbpPlaces;
  static linkGbpPlace = gbp.linkGbpPlace;
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

  // ── Growth / SEO ──

  static getSeoScorecard = seo.getSeoScorecard;
  static runSeoAgent = seo.runSeoAgent;
  static runGeoAgent = seo.runGeoAgent;
  static runGrowthAgents = seo.runGrowthAgents;
  static getLastGrowthRun = seo.getLastGrowthRun;

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
