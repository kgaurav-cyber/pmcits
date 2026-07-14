
(async () => {
  try {
    const resAuth = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee1@pmcits.gov.in', password: 'password123' })
    });
    const authData = await resAuth.json();
    console.log('AUTH_DATA:', authData);
    if (!authData.data || !authData.data.token) {
        throw new Error('Login failed');
    }
    const token = authData.data.token;
    
    const payload = {
      patient_type: 'Self',
      claim_type: 'IPD',
      total_amount_claimed: 0,
      bill_items: [],
      declaration: false
    };

    const res = await fetch('http://localhost:5000/api/claims/draft', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('STATUS:', res.status);
    console.log('RESPONSE:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
})();

