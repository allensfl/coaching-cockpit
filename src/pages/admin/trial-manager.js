// Trial Manager Frontend Integration
// File: trial-manager.js (Root-Level für Frontend)

class TrialManager {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.init();
    }

    async init() {
        console.log('Trial Manager initialized');
        await this.loadTrialStatus();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadTrialStatus() {
        try {
            const coachId = this.getCoachId();
            const response = await fetch(`${this.apiBase}/trial-management?coachId=${coachId}`);
            const data = await response.json();
            
            if (data.success) {
                this.trialData = data.trial;
                localStorage.setItem('trialData', JSON.stringify(this.trialData));
                console.log('Trial status loaded:', this.trialData);
            } else {
                console.log('No trial found, starting new trial...');
                await this.startTrial();
            }
        } catch (error) {
            console.error('Error loading trial status:', error);
            this.trialData = this.getDefaultTrialData();
        }
    }

    async startTrial() {
        try {
            const coachId = this.getCoachId();
            const response = await fetch(`${this.apiBase}/trial-management`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coachId: coachId,
                    email: this.getCoachEmail()
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.trialData = data.trial;
                localStorage.setItem('trialData', JSON.stringify(this.trialData));
                console.log('Trial started successfully:', this.trialData);
                
                // Track trial start event
                this.trackEvent('trial_started');
            }
        } catch (error) {
            console.error('Error starting trial:', error);
            this.trialData = this.getDefaultTrialData();
        }
    }

    async convertToPaid() {
        try {
            const coachId = this.getCoachId();
            const response = await fetch(`${this.apiBase}/trial-management`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coachId: coachId,
                    action: 'convert_to_paid'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.trialData = data.trial;
                localStorage.setItem('trialData', JSON.stringify(this.trialData));
                this.updateUI();
                
                // Close any open modals
                document.querySelectorAll('.trial-modal-overlay').forEach(modal => modal.remove());
                
                // Show success message
                this.showSuccessMessage('Premium Account aktiviert! 🎉');
                
                // Track conversion event
                this.trackEvent('trial_converted');
                
                console.log('Trial converted to paid successfully');
            }
        } catch (error) {
            console.error('Error converting trial:', error);
        }
    }

    setupEventListeners() {
        // Trial Manager Button
        const trialBtn = document.getElementById('trialManagerBtn');
        if (trialBtn) {
            trialBtn.addEventListener('click', () => {
                this.showTrialModal();
                this.trackEvent('trial_modal_opened');
            });
            console.log('Trial Manager Button listener attached');
        } else {
            console.log('Trial Manager Button not found - creating one');
            this.createTrialManagerButton();
        }

        // Upgrade Button
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                this.convertToPaid();
            });
        }

        // Feature Gate Buttons
        document.querySelectorAll('[data-trial-feature]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feature = btn.dataset.trialFeature;
                if (!this.canUseFeature(feature)) {
                    e.preventDefault();
                    this.showUpgradePrompt(feature);
                    this.trackEvent('feature_gate_hit', { feature });
                }
            });
        });
    }

    createTrialManagerButton() {
        // Create trial manager button if it doesn't exist
        const header = document.querySelector('header') || document.querySelector('.header') || document.body;
        const button = document.createElement('button');
        button.id = 'trialManagerBtn';
        button.textContent = 'Trial Status';
        button.className = 'trial-btn';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999;
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-weight: 500;
        `;
        
        header.appendChild(button);
        
        button.addEventListener('click', () => {
            this.showTrialModal();
            this.trackEvent('trial_modal_opened');
        });
        
        console.log('Trial Manager Button created');
    }

    updateUI() {
        if (!this.trialData) return;

        const isActive = this.trialData.status === 'active';
        const isPaid = this.trialData.status === 'paid';
        const daysLeft = this.getDaysLeft();

        console.log('Updating UI:', { isActive, isPaid, daysLeft });

        // Update Trial Banner
        this.updateTrialBanner(isActive, daysLeft);
        
        // Update Feature Gates
        this.updateFeatureGates(isPaid);
        
        // Update Trial Manager Button
        this.updateTrialManagerButton(isActive, isPaid, daysLeft);
    }

    updateTrialBanner(isActive, daysLeft) {
        let banner = document.getElementById('trialBanner');
        
        if (!banner && isActive && daysLeft <= 7) {
            banner = document.createElement('div');
            banner.id = 'trialBanner';
            banner.className = 'trial-banner';
            document.body.insertBefore(banner, document.body.firstChild);
        }

        if (banner && isActive && daysLeft <= 7) {
            const urgencyClass = daysLeft <= 3 ? 'urgent' : 'warning';
            banner.className = `trial-banner ${urgencyClass}`;
            banner.innerHTML = `
                <div class="trial-banner-content">
                    <span>🚀 Noch ${daysLeft} Tage in deiner kostenlosen Testphase</span>
                    <button onclick="trialManager.showUpgradeModal()" class="upgrade-btn-small">
                        Jetzt upgraden
                    </button>
                </div>
            `;
        } else if (banner && (!isActive || daysLeft > 7)) {
            banner.style.display = 'none';
        }
    }

    updateFeatureGates(isPaid) {
        document.querySelectorAll('[data-trial-feature]').forEach(element => {
            const feature = element.dataset.trialFeature;
            const canUse = isPaid || this.canUseFeature(feature);
            
            if (!canUse) {
                element.classList.add('trial-locked');
                element.setAttribute('title', 'Premium Feature - Upgrade erforderlich');
            } else {
                element.classList.remove('trial-locked');
                element.removeAttribute('title');
            }
        });
    }

    updateTrialManagerButton(isActive, isPaid, daysLeft) {
        const btn = document.getElementById('trialManagerBtn');
        if (!btn) return;

        if (isPaid) {
            btn.textContent = '✅ Premium';
            btn.className = 'trial-btn premium';
        } else if (isActive) {
            btn.textContent = `⏰ Trial (${daysLeft})`;
            btn.className = daysLeft <= 3 ? 'trial-btn urgent' : 'trial-btn active';
        } else {
            btn.textContent = '❌ Expired';
            btn.className = 'trial-btn expired';
        }
    }

    canUseFeature(feature) {
        if (this.trialData?.status === 'paid') return true;
        if (this.trialData?.status !== 'active') return false;

        // Trial feature limits
        const limits = {
            'advanced_analytics': true,
            'file_upload': false,
            'calendar_integration': false,
            'email_automation': true,
            'client_management': true,
            'reports': false,
            'integrations': false
        };

        return limits[feature] || false;
    }

    showTrialModal() {
        const modal = document.createElement('div');
        modal.className = 'trial-modal-overlay';
        modal.innerHTML = `
            <div class="trial-modal">
                <div class="trial-modal-header">
                    <h3>Trial Status</h3>
                    <button onclick="this.closest('.trial-modal-overlay').remove()">&times;</button>
                </div>
                <div class="trial-modal-content">
                    ${this.getTrialModalContent()}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    getTrialModalContent() {
        if (!this.trialData) return '<p>Fehler beim Laden der Trial-Daten</p>';

        const status = this.trialData.status;
        const daysLeft = this.getDaysLeft();
        const startDate = new Date(this.trialData.created_at).toLocaleDateString('de-DE');

        if (status === 'paid') {
            return `
                <div class="trial-status premium">
                    <h4>✅ Premium Account Aktiv</h4>
                    <p>Du hast Zugang zu allen Features!</p>
                    <div class="feature-grid">
                        <div class="feature-item available">✅ Unbegrenzte Clients</div>
                        <div class="feature-item available">✅ Erweiterte Analytics</div>
                        <div class="feature-item available">✅ File Upload</div>
                        <div class="feature-item available">✅ Kalender Integration</div>
                        <div class="feature-item available">✅ Email Automation</div>
                        <div class="feature-item available">✅ Berichte & Exporte</div>
                    </div>
                </div>
            `;
        } else if (status === 'active') {
            return `
                <div class="trial-status active">
                    <h4>⏰ Trial Aktiv</h4>
                    <p><strong>${daysLeft} Tage</strong> verbleibend (seit ${startDate})</p>
                    
                    <div class="trial-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${((14 - daysLeft) / 14) * 100}%"></div>
                        </div>
                        <span class="progress-text">${14 - daysLeft} von 14 Tagen genutzt</span>
                    </div>
                    
                    <div class="feature-comparison">
                        <div class="feature-column">
                            <h5>✅ Trial Features</h5>
                            <div class="feature-item available">✅ Basic Analytics</div>
                            <div class="feature-item available">✅ Client Management</div>
                            <div class="feature-item available">✅ Email Benachrichtigungen</div>
                        </div>
                        
                        <div class="feature-column">
                            <h5>🔒 Premium Features</h5>
                            <div class="feature-item locked">🔒 File Upload</div>
                            <div class="feature-item locked">🔒 Kalender Integration</div>
                            <div class="feature-item locked">🔒 Erweiterte Analytics</div>
                            <div class="feature-item locked">🔒 Berichte & Exporte</div>
                        </div>
                    </div>
                    
                    <button onclick="trialManager.convertToPaid()" class="upgrade-btn-full">
                        🚀 Jetzt auf Premium upgraden
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="trial-status expired">
                    <h4>❌ Trial Abgelaufen</h4>
                    <p>Deine 14-tägige Testphase ist beendet.</p>
                    <p>Upgrade jetzt, um weiterhin Zugang zu haben.</p>
                    
                    <div class="expired-features">
                        <p><strong>Was du verpasst:</strong></p>
                        <div class="feature-item locked">🔒 Client Management gesperrt</div>
                        <div class="feature-item locked">🔒 Analytics nicht verfügbar</div>
                        <div class="feature-item locked">🔒 Alle Premium Features</div>
                    </div>
                    
                    <button onclick="trialManager.convertToPaid()" class="upgrade-btn-full urgent">
                        💎 Premium Account aktivieren
                    </button>
                </div>
            `;
        }
    }

    showUpgradePrompt(feature) {
        const featureNames = {
            'file_upload': 'File Upload',
            'calendar_integration': 'Kalender Integration',
            'advanced_analytics': 'Erweiterte Analytics',
            'reports': 'Berichte & Exporte',
            'integrations': 'Integrationen'
        };

        const modal = document.createElement('div');
        modal.className = 'trial-modal-overlay';
        modal.innerHTML = `
            <div class="trial-modal">
                <div class="trial-modal-header">
                    <h3>Premium Feature</h3>
                    <button onclick="this.closest('.trial-modal-overlay').remove()">&times;</button>
                </div>
                <div class="trial-modal-content">
                    <div class="upgrade-prompt">
                        <div class="feature-icon">🔒</div>
                        <h4>${featureNames[feature] || feature}</h4>
                        <p>Dieses Feature ist nur in der Premium-Version verfügbar.</p>
                        <p>Upgrade jetzt und erhalte Zugang zu allen Features!</p>
                        <button onclick="trialManager.convertToPaid()" class="upgrade-btn-full">
                            🚀 Jetzt upgraden
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showUpgradeModal() {
        this.showTrialModal();
    }

    showSuccessMessage(message) {
        const success = document.createElement('div');
        success.className = 'success-message';
        success.innerHTML = `
            <div class="success-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        document.body.appendChild(success);
        
        setTimeout(() => {
            if (success.parentElement) {
                success.remove();
            }
        }, 5000);
    }

    getDaysLeft() {
        if (!this.trialData) return 0;
        
        const startDate = new Date(this.trialData.created_at);
        const endDate = new Date(startDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const daysLeft = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
        
        return Math.max(0, daysLeft);
    }

    getCoachId() {
        // Try different sources for coach ID
        return localStorage.getItem('coachId') || 
               sessionStorage.getItem('coachId') || 
               document.querySelector('[data-coach-id]')?.dataset.coachId ||
               'coach_demo_001'; // Fallback für Testing
    }

    getCoachEmail() {
        return localStorage.getItem('coachEmail') || 
               sessionStorage.getItem('coachEmail') || 
               document.querySelector('[data-coach-email]')?.dataset.coachEmail ||
               'demo@ki-online.coach';
    }

    getDefaultTrialData() {
        return {
            status: 'active',
            created_at: new Date().toISOString(),
            features_used: 0,
            days_left: 14
        };
    }

    // Analytics Integration
    async trackEvent(event, data = {}) {
        try {
            // Track to internal analytics
            const response = await fetch(`${this.apiBase}/analytics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coachId: this.getCoachId(),
                    event,
                    data: {
                        ...data,
                        trial_status: this.trialData?.status,
                        days_left: this.getDaysLeft()
                    }
                })
            });
            
            // Track to Google Analytics if available
            if (window.gtag) {
                window.gtag('event', event, {
                    trial_status: this.trialData?.status,
                    days_left: this.getDaysLeft(),
                    ...data
                });
            }
            
            console.log('Event tracked:', event, data);
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    // Public methods for external use
    getTrialStatus() {
        return this.trialData;
    }

    isFeatureAvailable(feature) {
        return this.canUseFeature(feature);
    }

    refreshTrialStatus() {
        return this.loadTrialStatus();
    }
}

// CSS Styles für Trial Manager
const trialManagerStyles = `
<style>
/* Trial Banner */
.trial-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    padding: 12px 16px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.trial-banner.warning {
    background: linear-gradient(90deg, #FF9800, #F57C00);
    color: white;
}

.trial-banner.urgent {
    background: linear-gradient(90deg, #f44336, #d32f2f);
    color: white;
    animation: pulse 2s infinite;
}

.trial-banner-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
}

.upgrade-btn-small {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s ease;
}

.upgrade-btn-small:hover {
    background: rgba(255,255,255,0.3);
    transform: translateY(-1px);
}

/* Trial Button */
.trial-btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    font-size: 14px;
}

.trial-btn.premium {
    background: linear-gradient(45deg, #4CAF50, #45a049);
    color: white;
}

.trial-btn.active {
    background: linear-gradient(45deg, #2196F3, #1976D2);
    color: white;
}

.trial-btn.urgent {
    background: linear-gradient(45deg, #f44336, #d32f2f);
    color: white;
    animation: pulse 2s infinite;
}

.trial-btn.expired {
    background: #9E9E9E;
    color: white;
}

.trial-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Modal Styles */
.trial-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.trial-modal {
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.trial-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #eee;
}

.trial-modal-header h3 {
    margin: 0;
    font-size: 20px;
    color: #333;
}

.trial-modal-header button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.trial-modal-header button:hover {
    background: #f5f5f5;
}

.trial-modal-content {
    padding: 24px;
}

/* Trial Status Styles */
.trial-status {
    text-align: center;
}

.trial-status h4 {
    margin-top: 0;
    font-size: 22px;
    margin-bottom: 16px;
}

.trial-progress {
    margin: 20px 0;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    border-radius: 4px;
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 12px;
    color: #666;
}

/* Feature Comparison */
.feature-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 20px 0;
    text-align: left;
}

.feature-column h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.feature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 16px 0;
}

.feature-item {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 6px;
}

.feature-item.available {
    background: #e8f5e8;
    color: #2e7d32;
}

.feature-item.locked {
    background: #ffeaa7;
    color: #e17055;
}

/* Upgrade Prompt */
.upgrade-prompt {
    text-align: center;
    padding: 20px 0;
}

.feature-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.upgrade-prompt h4 {
    margin: 0 0 16px 0;
    font-size: 24px;
    color: #333;
}

.upgrade-prompt p {
    color: #666;
    line-height: 1.5;
    margin-bottom: 12px;
}

/* Upgrade Button */
.upgrade-btn-full {
    background: linear-gradient(45deg, #2196F3, #21CBF3);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    margin-top: 20px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.upgrade-btn-full:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(33, 150, 243, 0.3);
}

.upgrade-btn-full.urgent {
    background: linear-gradient(45deg, #f44336, #ff6b6b);
    animation: pulse 2s infinite;
}

.upgrade-btn-full:active {
    transform: translateY(0);
}

/* Success Message */
.success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 3000;
    background: linear-gradient(45deg, #4CAF50, #45a049);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    animation: slideIn 0.3s ease;
}

.success-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.success-message button {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Feature Locking */
.trial-locked {
    opacity: 0.6;
    pointer-events: none;
    position: relative;
}

.trial-locked::after {
    content: '🔒';
    position: absolute;
    top: 4px;
    right: 4px;
    background: #f44336;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

/* Animations */
@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.8; }
    100% { opacity: 1; }
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .trial-banner-content {
        flex-direction: column;
        gap: 8px;
    }
    
    .trial-modal {
        width: 95%;
        margin: 20px;
    }
    
    .feature-comparison {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    
    .feature-grid {
        grid-template-columns: 1fr;
    }
    
    .trial-btn {
        font-size: 12px;
        padding: 6px 12px;
    }
}
</style>
`;

// Auto-Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Inject CSS
    document.head.insertAdjacentHTML('beforeend', trialManagerStyles);
    
    // Initialize Trial Manager
    window.trialManager = new TrialManager();
    
    console.log('✅ Trial Manager loaded and initialized');
});

// Export für Testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrialManager;
}