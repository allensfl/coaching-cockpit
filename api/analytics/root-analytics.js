<!-- Google Analytics 4 Setup -->
<!-- Fügen Sie diesen Code in den <head> Bereich ALLER Ihrer HTML-Dateien ein -->

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  // WICHTIG: Ersetzen Sie GA_MEASUREMENT_ID mit Ihrer echten Google Analytics ID
  gtag('config', 'GA_MEASUREMENT_ID', {
    page_title: document.title,
    page_location: window.location.href
  });
</script>

<!-- Enhanced Analytics Setup für Coaching Cockpit -->
<script>
class CoachingAnalytics {
  constructor() {
    this.userId = null;
    this.sessionStart = Date.now();
    this.init();
  }

  init() {
    this.userId = this.getUserId();
    this.setupEventTracking();
    this.trackPageView();
  }

  getUserId() {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  // Custom Event Tracking
  trackEvent(eventName, parameters = {}) {
    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        custom_parameter_1: parameters.category || 'coaching',
        custom_parameter_2: parameters.action || 'unknown',
        value: parameters.value || 1,
        user_id: this.userId,
        ...parameters
      });
    }

    // Send to our custom analytics
    if (window.trialManager) {
      window.trialManager.trackEvent(eventName, parameters);
    }

    // Console log for debugging
    console.log('Analytics Event:', eventName, parameters);
  }

  trackPageView() {
    const pageName = this.getPageName();
    
    this.trackEvent('page_view', {
      page_name: pageName,
      page_path: window.location.pathname,
      page_title: document.title
    });
  }

  // Business-specific events
  trackClientAction(action, clientData = {}) {
    this.trackEvent('client_action', {
      action: action,
      client_id: clientData.id || 'unknown',
      client_status: clientData.status || 'unknown',
      category: 'client_management'
    });
  }

  trackCoachingSession(sessionData = {}) {
    this.trackEvent('coaching_session', {
      session_type: sessionData.type || 'ai_chat',
      session_phase: sessionData.phase || 'unknown',
      session_duration: sessionData.duration || 0,
      client_id: sessionData.client_id || 'unknown',
      category: 'coaching'
    });
  }

  trackTrialEvent(action, trialData = {}) {
    this.trackEvent('trial_event', {
      action: action, // 'started', 'reminder_shown', 'converted', 'expired'
      days_remaining: trialData.days_remaining || 0,
      trial_features_used: trialData.features_used || [],
      category: 'trial'
    });
  }

  trackPaymentEvent(action, paymentData = {}) {
    this.trackEvent('payment', {
      action: action, // 'initiated', 'completed', 'failed'
      plan_type: paymentData.plan || 'unknown',
      amount: paymentData.amount || 0,
      currency: 'CHF',
      category: 'revenue'
    });
  }

  trackUserEngagement() {
    const timeOnPage = Date.now() - this.sessionStart;
    
    this.trackEvent('user_engagement', {
      engagement_time_msec: timeOnPage,
      page_name: this.getPageName(),
      category: 'engagement'
    });
  }

  // Helper functions
  getPageName() {
    const path = window.location.pathname;
    const pageNames = {
      '/main.html': 'landing_page',
      '/coach-dashboard.html': 'coach_dashboard',
      '/client-dashboard.html': 'client_dashboard',
      '/chat.html': 'ai_chat',
      '/upgrade.html': 'pricing_page',
      '/coach-registration.html': 'coach_registration'
    };
    
    return pageNames[path] || 'unknown_page';
  }

  setupEventTracking() {
    // Track clicks on important elements
    document.addEventListener('click', (e) => {
      const element = e.target;
      
      // Track CTA button clicks
      if (element.matches('.btn-primary, .cta-button, [href*="upgrade"]')) {
        this.trackEvent('cta_click', {
          button_text: element.textContent?.trim() || 'unknown',
          button_location: this.getPageName(),
          category: 'conversion'
        });
      }
      
      // Track navigation clicks
      if (element.matches('a[href*=".html"]')) {
        this.trackEvent('navigation', {
          from_page: this.getPageName(),
          to_page: element.getAttribute('href'),
          link_text: element.textContent?.trim() || 'unknown',
          category: 'navigation'
        });
      }
      
      // Track trial-related clicks
      if (element.matches('.trial-upgrade-btn, [href*="trial"]')) {
        this.trackEvent('trial_upgrade_click', {
          source_page: this.getPageName(),
          trial_status: window.trialManager?.trialData?.trial_active ? 'active' : 'expired',
          category: 'trial'
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formName = form.id || form.className || 'unknown_form';
      
      this.trackEvent('form_submit', {
        form_name: formName,
        page_name: this.getPageName(),
        category: 'form'
      });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      
      if (scrollPercent > maxScroll && scrollPercent % 25 === 0) { // Track at 25%, 50%, 75%, 100%
        maxScroll = scrollPercent;
        this.trackEvent('scroll_depth', {
          scroll_depth: scrollPercent,
          page_name: this.getPageName(),
          category: 'engagement'
        });
      }
    });

    // Track time on page when leaving
    window.addEventListener('beforeunload', () => {
      this.trackUserEngagement();
    });
  }
}

// Initialize Analytics
const coachingAnalytics = new CoachingAnalytics();
window.coachingAnalytics = coachingAnalytics;

// Global tracking functions for easy use
window.trackEvent = function(eventName, parameters = {}) {
  if (window.coachingAnalytics) {
    window.coachingAnalytics.trackEvent(eventName, parameters);
  }
};

window.trackClientAction = function(action, clientData = {}) {
  if (window.coachingAnalytics) {
    window.coachingAnalytics.trackClientAction(action, clientData);
  }
};

window.trackCoachingSession = function(sessionData = {}) {
  if (window.coachingAnalytics) {
    window.coachingAnalytics.trackCoachingSession(sessionData);
  }
};

window.trackTrialEvent = function(action, trialData = {}) {
  if (window.coachingAnalytics) {
    window.coachingAnalytics.trackTrialEvent(action, trialData);
  }
};

window.trackPaymentEvent = function(action, paymentData = {}) {
  if (window.coachingAnalytics) {
    window.coachingAnalytics.trackPaymentEvent(action, paymentData);
  }
};
</script>

<!-- SETUP ANLEITUNG:

1. Google Analytics 4 Account erstellen:
   - Gehen Sie zu https://analytics.google.com
   - Erstellen Sie ein neues Property für "KI-Online.Coach"
   - Wählen Sie "Web" als Plattform
   - Notieren Sie sich die MEASUREMENT_ID (Format: G-XXXXXXXXXX)

2. Measurement ID einsetzen:
   - Ersetzen Sie "GA_MEASUREMENT_ID" oben mit Ihrer echten ID
   - Format: G-1234567890

3. Custom Events in GA4 konfigurieren:
   - Gehen Sie zu Admin > Custom Definitions > Custom Events
   - Erstellen Sie diese Events:
     * client_action
     * coaching_session  
     * trial_event
     * payment
     * user_engagement

4. Goals/Conversions definieren:
   - trial_event (action = 'converted')
   - payment (action = 'completed')
   - coaching_session (für Engagement)

5. Dashboard erstellen:
   - Erstellen Sie Custom Reports für:
     * Trial Conversion Rate
     * Payment Completion Rate
     * User Engagement Metrics
     * Page Performance

6. Integration testen:
   - Öffnen Sie Google Analytics Realtime Reports
   - Navigieren Sie durch Ihre Website
   - Prüfen Sie ob Events ankommen

-->

<style>
/* Analytics Debug Panel (nur für Development) */
.analytics-debug {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  max-width: 300px;
  z-index: 1000;
  display: none; /* Zeigen nur im Debug-Modus */
}

.analytics-debug.show {
  display: block;
}

.analytics-debug h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.analytics-debug .event {
  margin-bottom: 4px;
  opacity: 0.8;
}
</style>

<!-- Debug Panel (entfernen Sie das in Production) -->
<div id="analytics-debug" class="analytics-debug">
  <h4>📊 Analytics Debug</h4>
  <div id="debug-events"></div>
</div>

<script>
// Analytics Debug (nur für Development)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app')) {
  const debugPanel = document.getElementById('analytics-debug');
  const debugEvents = document.getElementById('debug-events');
  
  // Show debug panel
  debugPanel.classList.add('show');
  
  // Override trackEvent to show in debug panel
  const originalTrackEvent = window.trackEvent;
  window.trackEvent = function(eventName, parameters = {}) {
    // Call original function
    if (originalTrackEvent) {
      originalTrackEvent(eventName, parameters);
    }
    
    // Add to debug panel
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event';
    eventDiv.textContent = `${new Date().toLocaleTimeString()}: ${eventName}`;
    debugEvents.insertBefore(eventDiv, debugEvents.firstChild);
    
    // Keep only last 5 events
    while (debugEvents.children.length > 5) {
      debugEvents.removeChild(debugEvents.lastChild);
    }
  };
}
</script>