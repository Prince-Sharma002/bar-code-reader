const BASE_URL = 'http://localhost:5000/api';

const testDeletion = async () => {
  try {
    console.log('--- TEST DELETION ONLY USING FETCH ---');
    
    // 1. Create a scan
    const createRes = await fetch(`${BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcodeValue: 'TEST-55555',
        format: 'QR_CODE',
        deviceId: 'TEST-DEV',
        type: 'product'
      })
    });
    const createData = await createRes.json();
    const id = createData.data._id;
    console.log('Created Scan ID:', id);

    // 2. Verify it's in history
    const historyRes = await fetch(`${BASE_URL}/scan-history`);
    const historyData = await historyRes.json();
    const found = historyData.data.find(s => s._id === id);
    if (!found) throw new Error('Could not find created scan in history');
    console.log('Confirmed: Scan exists in history.');

    // 3. Delete it
    console.log('Deleting...');
    const delRes = await fetch(`${BASE_URL}/scan-history`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] })
    });
    const delData = await delRes.json();
    console.log('Delete Response:', delData);

    // 4. Verify gone
    const historyRes2 = await fetch(`${BASE_URL}/scan-history`);
    const historyData2 = await historyRes2.json();
    const stillThere = historyData2.data.find(s => s._id === id);
    if (stillThere) {
      console.error('FAIL: Scan still exists after deletion!');
    } else {
      console.log('SUCCESS: Scan deleted correctly.');
    }

  } catch (err) {
    console.error('Test Failed:', err.message);
  }
};

testDeletion();
