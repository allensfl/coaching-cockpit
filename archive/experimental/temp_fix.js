function validateTokenAndLoadData(token) {
    if (token === 'demo') {
        loadDemoData();
        return;
    }
    
    fetch('/api/validate-client-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateDashboard(data.client, data.coach);
        } else {
            console.log('Token validation failed, loading demo data');
            loadDemoData();
        }
    })
    .catch(error => {
        console.log('API error, loading demo data:', error);
        loadDemoData();
    });
}
