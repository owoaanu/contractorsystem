<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { Toast, showAlert } from './utils/alert';
  import { loadRemitaScript, processRemitaPayment } from './utils/payment';
  import { LOGO_URL, BASE_PATH } from './constants';

  let companyName = '';
  let email = '';
  let phone = '';
  let password = '';
  let isProcessing = false;

  let step = 1;
  let token = '';
  let locationAddress = '';
  let postalAddress = '';
  let category = 'Construction';
  let cacNumber = '';
  let tin = '';
  let registrationFee = 10000;
  let categoriesData = [];
  let notices: any[] = [];

  $: categoryFee = categoriesData.find(c => c.name === category)?.registration_fee || 0;

  onMount(async () => {
    loadRemitaScript();
    
    try {
      const [settingsRes, catRes] = await Promise.all([
        fetch(import.meta.env.VITE_API_URL + '/api/settings'),
        fetch(import.meta.env.VITE_API_URL + '/api/categories')
      ]);
      const settingsData = await settingsRes.json();
      const catData = await catRes.json();

      if (settingsData.success && settingsData.data.registration_fee) {
        registrationFee = parseFloat(settingsData.data.registration_fee);
      }
      if (catData.success) {
        categoriesData = catData.data;
        if (categoriesData.length > 0) {
          category = categoriesData[0].name;
        }
      }
      
      // Fetch public notices
      fetch(import.meta.env.VITE_API_URL + '/api/notices')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            notices = data.data;
          }
        }).catch(e => console.error("Failed to load notices:", e));

    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  });

  async function handlePayment() {
    if (companyName.trim().length < 3) {
      Toast.fire({ icon: 'error', title: 'Company Name must be at least 3 characters' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.fire({ icon: 'error', title: 'Please enter a valid email address' });
      return;
    }
    
    const phoneRegex = /^[0-9+\s-]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      Toast.fire({ icon: 'error', title: 'Please enter a valid phone number (10-15 digits)' });
      return;
    }

    try {
      isProcessing = true;
      Toast.fire({ icon: 'info', title: 'Checking registration status...' });

      const checkRes = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/check-registration', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, telephone: phone })
      });
      const checkData = await checkRes.json();
      
      if (checkData.success && checkData.exists) {
          if (checkData.step === 'completed') {
              isProcessing = false;
              await showAlert("Already Registered", "This email or phone is already fully registered. Please sign in.", "error");
              navigate('/login');
              return;
          } else if (checkData.step === 2) {
              isProcessing = false;
              Toast.fire({ icon: 'info', title: 'Incomplete registration detected. Resuming at Step 2...' });
              token = checkData.token;
              localStorage.setItem('contractor_token', token);
              step = 2;
              return;
          }
      }

      Toast.fire({ icon: 'info', title: 'Initiating payment...' });

      const initRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/initiate', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName, email, phone, payment_type: 'registration' })
      });
      const initData = await initRes.json();
      
      if (!initData.success) {
        throw new Error(initData.error || "Failed to initialize payment.");
      }

      const { transactionId, rrr, amount } = initData.data;

      processRemitaPayment({
        transactionId: transactionId,
        amount: amount || registrationFee,
        email: email,
        firstName: companyName,
        lastName: "Registration",
        phoneNumber: phone,
        narration: "Form Purchase Fee",
        onSuccess: async (response) => {
            console.log("Remita Payment Successful", response);
            Toast.fire({ icon: 'info', title: 'Verifying payment...' });
            
            try {
              const verifyRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/verify', {
                method: 'POST',
                credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rrr: response.paymentReference || response.transactionId || rrr, transactionId: transactionId, amount: amount || registrationFee })
              });
              const verifyData = await verifyRes.json();
              if (!verifyData.success) throw new Error("Payment Verification Failed");
              
              const regRes = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/register', {
                method: 'POST',
                credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  rrr: rrr,
                  company_name: companyName,
                  email: email,
                  telephone: phone,
                  location_address: 'Pending Completion',
                  postal_address: 'Pending Completion',
                  category: 'Pending Completion'
                })
              });

              const regData = await regRes.json();
              isProcessing = false;

              if (regRes.ok && regData.success) {
                Toast.fire({ icon: 'success', title: 'Payment Successful! Please complete your profile.' });
                token = regData.token;
                localStorage.setItem('contractor_token', token);
                step = 2;
              } else {
                showAlert("Registration Failed", regData.error || "Unknown error occurred.", "error");
              }
            } catch (err: any) {
              isProcessing = false;
              showAlert("Registration Error", err.message || "Something went wrong.", "error");
            }
        },
        onError: (response) => {
            console.log("Remita Payment Error", response);
            isProcessing = false;
            showAlert("Payment Failed", "Payment failed or was cancelled.", "error");
        },
        onClose: () => {
            console.log("Remita Modal Closed");
            isProcessing = false;
        }
      });
    } catch (err: any) {
      isProcessing = false;
      showAlert("Error", err.message || "Failed to connect to payment server. Please try again.", "error");
    }
  }

  async function skipPayment() {
    if (companyName.trim().length < 3) {
      Toast.fire({ icon: 'error', title: 'Company Name must be at least 3 characters' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.fire({ icon: 'error', title: 'Please enter a valid email address' });
      return;
    }
    
    const phoneRegex = /^[0-9+\s-]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      Toast.fire({ icon: 'error', title: 'Please enter a valid phone number (10-15 digits)' });
      return;
    }

    try {
      isProcessing = true;
      Toast.fire({ icon: 'info', title: 'Checking registration status...' });

      const checkRes = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/check-registration', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, telephone: phone })
      });
      const checkData = await checkRes.json();
      
      if (checkData.success && checkData.exists) {
          if (checkData.step === 'completed') {
              isProcessing = false;
              await showAlert("Already Registered", "This email or phone is already fully registered. Please sign in.", "error");
              navigate('/login');
              return;
          } else if (checkData.step === 2) {
              isProcessing = false;
              Toast.fire({ icon: 'info', title: 'Incomplete registration detected. Resuming at Step 2...' });
              token = checkData.token;
              localStorage.setItem('contractor_token', token);
              step = 2;
              return;
          }
      }

      Toast.fire({ icon: 'info', title: 'Skipping payment (Dev Mode)...' });

      const initRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/initiate', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName, email, phone, payment_type: 'registration' })
      });
      const initData = await initRes.json();
      if (!initData.success) throw new Error(initData.error || "Failed to initialize payment.");

      const { rrr } = initData.data;

      const verifyRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/verify', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rrr: response.paymentReference || response.transactionId || rrr, transactionId: transactionId, amount: amount || registrationFee })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error("Payment Verification Failed");
      
      const regRes = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/register', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rrr: rrr,
          company_name: companyName,
          email: email,
          telephone: phone,
          location_address: 'Pending Completion',
          postal_address: 'Pending Completion',
          category: 'Pending Completion'
        })
      });

      const regData = await regRes.json();
      isProcessing = false;

      if (regRes.ok && regData.success) {
        Toast.fire({ icon: 'success', title: 'Payment Successful! Please complete your profile.' });
        token = regData.token;
        localStorage.setItem('contractor_token', token);
        step = 2;
      } else {
        showAlert("Registration Failed", regData.error || "Unknown error occurred.", "error");
      }
    } catch (err: any) {
      isProcessing = false;
      showAlert("Error", err.message || "Failed to connect to server.", "error");
    }
  }

  async function handleCategoryPayment() {
    if (!locationAddress || !postalAddress || !cacNumber || !tin) {
      Toast.fire({ icon: 'error', title: 'Please fill in all required fields.' });
      return;
    }
    if (password.length < 6) {
      Toast.fire({ icon: 'error', title: 'Password must be at least 6 characters' });
      return;
    }

    try {
      isProcessing = true;
      Toast.fire({ icon: 'info', title: 'Initializing payment...' });

      const initRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/initiate', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          email: email,
          phone: phone,
          payment_type: 'category',
          category_name: category
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || "Failed to initialize payment.");
      }

      const { transactionId, rrr, amount } = initData.data;

      processRemitaPayment({
        transactionId: transactionId,
        amount: amount || categoryFee,
        email: email,
        firstName: companyName,
        lastName: "Category Registration",
        onSuccess: async function (response) {
          try {
            isProcessing = true;
            Toast.fire({ icon: 'info', title: 'Verifying payment...' });

            const verifyRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/verify', {
              method: 'POST',
              credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rrr: response.paymentReference || response.transactionId || rrr, transactionId: transactionId, amount: amount || registrationFee })
            });
            const verifyData = await verifyRes.json();
            
            if (!verifyRes.ok || !verifyData.success) {
               throw new Error(verifyData.error || "Payment verification failed.");
            }

            const token = localStorage.getItem('contractor_token');
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/profile', {
              method: 'PUT',
              credentials: 'include',
          headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                location_address: locationAddress,
                postal_address: postalAddress,
                category: category,
                cac_number: cacNumber,
                tin: tin,
                password: password,
                category_rrr: rrr
              })
            });
            const data = await res.json();
            isProcessing = false;
            if (res.ok && data.success) {
              Toast.fire({ icon: 'success', title: 'Registration Fully Complete! Please sign in.' });
              navigate('/login');
            } else {
              showAlert("Update Failed", data.error || "Failed to update profile.", "error");
            }

          } catch (err: any) {
            isProcessing = false;
            showAlert("Verification Error", err.message || "Failed to complete registration.", "error");
          }
        },
        onError: function (response) {
          isProcessing = false;
          showAlert("Payment Failed", "Transaction was not successful.", "error");
        },
        onClose: function () {
          isProcessing = false;
          console.log("Payment widget closed.");
        }
      });
    } catch (err: any) {
      isProcessing = false;
      showAlert("Error", err.message || "Failed to connect to server.", "error");
    }
  }

  async function skipCategoryPayment() {
    if (!locationAddress || !postalAddress || !cacNumber || !tin) {
      Toast.fire({ icon: 'error', title: 'Please fill in all required fields.' });
      return;
    }
    if (password.length < 6) {
      Toast.fire({ icon: 'error', title: 'Password must be at least 6 characters' });
      return;
    }

    try {
      isProcessing = true;
      Toast.fire({ icon: 'info', title: 'Bypassing category payment...' });

      const bypassRes = await fetch(import.meta.env.VITE_API_URL + '/api/remita/bypass', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: companyName, 
          email: email, 
          phone: phone,
          payment_type: 'category',
          amount: categoryFee
        })
      });
      const bypassData = await bypassRes.json();
      
      if (!bypassRes.ok || !bypassData.success) {
         throw new Error(bypassData.error || "Failed to bypass payment.");
      }

      const { rrr } = bypassData.data;

      const token = localStorage.getItem('contractor_token');
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/profile', {
        method: 'PUT',
        credentials: 'include',
          headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          location_address: locationAddress,
          postal_address: postalAddress,
          category: category,
          cac_number: cacNumber,
          tin: tin,
          password: password,
          category_rrr: rrr
        })
      });
      const data = await res.json();
      isProcessing = false;
      if (res.ok && data.success) {
        Toast.fire({ icon: 'success', title: 'Registration Fully Complete! Please sign in.' });
        navigate('/login');
      } else {
        showAlert("Update Failed", data.error || "Failed to update profile.", "error");
      }
    } catch (err: any) {
      isProcessing = false;
      showAlert("Error", err.message || "Failed to connect to server.", "error");
    }
  }
</script>

<div class="main-wrapper login-body">
  <div class="container-fluid px-0">
    <div class="row g-0 min-vh-100">
      
      <!-- Left Side Info Area (Dynamic based on Step) -->
      <div class="col-lg-6 d-none d-lg-flex flex-column justify-content-start bg-light border-end relative-bg px-0 pt-3 overflow-x-hidden overflow-y-auto" style="height: 100vh;">
        <!-- Top Section -->
        <div class="info-content col-11 me-auto ps-4 pe-0 mb-3 pb-2 mt-2">
          <div class="text-center mb-2 pe-4">
            <img src={LOGO_URL} alt="Logo" style="max-height: 60px;">
          </div>
          <h3 class="fw-bold mb-3 text-center" style="color: #FF4667;">CONTRACTOR REGISTRATION</h3>
          
          {#if step === 1}
            <div class="bg-white p-4 rounded shadow-sm text-start mt-4 w-100">
              <h5 class="text-dark fw-bold mb-4" style="font-size: 18px;">Instructions for Contractors:</h5>
              <ul class="list-unstyled mb-0 text-muted" style="font-size: 17px; line-height: 1.6;">
                <li class="mb-3 d-flex align-items-start">
                  <i class="isax isax-tick-circle text-primary fs-20 me-3 mt-1"></i> 
                  <span>Pay a non-refundable fee of <strong class="text-dark">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(registrationFee)}</strong> for the purchase of the form via Remita.</span>
                </li>
                <li class="mb-3 d-flex align-items-start">
                  <i class="isax isax-tick-circle text-primary fs-20 me-3 mt-1"></i> 
                  <span>Upon successful payment, complete your proper company registration.</span>
                </li>
                <li class="d-flex align-items-start">
                  <i class="isax isax-tick-circle text-primary fs-20 me-3 mt-1"></i> 
                  <span>Wait for administrative approval before you can access contract bids.</span>
                </li>
              </ul>
            </div>
          {:else}
            <div class="bg-white p-4 rounded shadow-sm text-start">
              <h5 class="text-dark mb-3"><i class="isax isax-category me-2 text-primary"></i> CATEGORIES OF REGISTRATION</h5>
              <p class="mb-4 text-muted text-sm">You will be requested to choose at least a Category as shown in the table below, you are required to register for your choice category and make payment accordingly via remita.</p>
              <div class="table-responsive">
                <table class="table table-bordered table-sm text-black mb-0">
                  <thead class="table-light">
                    <tr>
                      <th class="text-xs">CATEGORY</th>
                      <th class="text-xs">CONTRACT VALUE</th>
                      <th class="text-xs">REG. FEE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each categoriesData as cat}
                      <tr>
                        <td class="text-sm">
                          <strong>{cat.code} - {cat.name}</strong>
                        </td>
                        <td class="text-sm">{cat.contract_value}</td>
                        <td class="text-success fw-bold text-sm">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(cat.registration_fee)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>

        <!-- Notice Board Section -->
        <div class="w-100 mt-auto position-relative" style="overflow: hidden; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
          <img src="{BASE_PATH}/assets/img/bg/bg-19.png" alt="" class="w-100 h-100 position-absolute top-0 start-0" style="object-fit: cover; opacity: 0.15; z-index: 0; pointer-events: none;">
          <div class="w-100 h-100 position-relative z-1 p-4 d-flex flex-column justify-content-center">
            <div class="row align-items-start">
              <div class="col-12 mb-3 pb-2 border-bottom border-light border-opacity-25">
                <h4 class="text-white fw-bold mb-0 d-flex align-items-center">
                  <i class="isax isax-notification-bing me-2"></i> Official Notice Board
                </h4>
              </div>
              
              <div class="col-12">
                <div class="row mt-2">
                  {#if notices.length > 0}
                    {#each notices.slice(0, 4) as notice}
                      <div class="col-12 mb-4">
                        <div class="position-relative ps-4 pe-3 py-2" style="border-left: 3px solid {notice.priority === 'high' ? '#ff4d4f' : '#4dabf7'}; border-radius: 2px;">
                          <div class="d-flex align-items-center justify-content-between mb-2">
                            <h5 class="text-white fw-bold mb-0 d-flex align-items-center" style="letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                              {notice.title}
                              {#if notice.priority === 'high'}
                                <span class="badge bg-danger rounded-pill ms-3 py-1 px-2" style="font-size: 10px; letter-spacing: 1px; box-shadow: 0 0 10px rgba(220, 53, 69, 0.6); border: 1px solid rgba(255,255,255,0.2);">URGENT</span>
                              {/if}
                            </h5>
                            <span class="text-white opacity-75" style="font-size: 12.5px; font-weight: 500;">
                              <i class="isax isax-calendar-1 me-1"></i> {new Date(notice.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p class="text-white opacity-75 mb-0 mt-2" style="font-size: 14.5px; line-height: 1.7; font-weight: 300;">
                            {notice.content}
                          </p>
                        </div>
                      </div>
                    {/each}
                  {:else}
                    <div class="col-12 mb-4">
                      <p class="text-white opacity-75 mb-0">No new announcements at this time.</p>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side Form Area -->
      <div class="col-lg-6 d-flex align-items-center justify-content-center position-relative" style="background-image: url('{BASE_PATH}/assets/img/bg/bg-20.png'); background-size: cover; background-position: center; background-repeat: no-repeat; background-color: #ffffff; min-height: 100vh;">
        <!-- Soft Overlay for the background to make the form pop -->
        <div class="position-absolute top-0 start-0 w-100 h-100" style="background: rgba(255,255,255,0.4); pointer-events: none;"></div>
        
        <div class="login-wrapper w-100 p-4 p-md-5 position-relative z-1">
          <div class="loginbox mx-auto p-4 p-md-5" style="max-width: 600px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.6); border-radius: 1.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
            <div class="w-100">
              
              <!-- Mobile Logo -->
              <div class="img-logo text-center mb-4 d-lg-none">
                <img src={LOGO_URL} class="img-fluid" alt="Logo" style="max-height: 60px;">
                <h4 class="fw-bold mt-3" style="color: #FF4667;">Contractor Portal</h4>
              </div>
              
              <h1 class="text-center">{step === 1 ? 'Form Purchase' : 'Detailed Profile'}</h1>
              <div class="reset-password text-center mb-4">
                <p class="mb-0 text-muted">
                  {step === 1 ? `Provide basic info and pay ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(registrationFee)} to proceed` : 'Complete your company profile setup'}
                </p>
              </div>

              {#if step === 1}
                <form on:submit|preventDefault={handlePayment}>
                  <div class="form-group mb-4">
                    <label class="form-control-label">Company Name</label>
                    <input bind:value={companyName} required type="text" class="form-control" placeholder="Payer / Company Name">
                  </div>
                  
                  <div class="form-group mb-4">
                    <label class="form-control-label">Email Address</label>
                    <input bind:value={email} required type="email" class="form-control" placeholder="hello@example.com">
                  </div>
                  
                  <div class="form-group mb-4">
                    <label class="form-control-label">Phone Number</label>
                    <input bind:value={phone} required type="tel" class="form-control" placeholder="+234...">
                  </div>
    
                  <div class="d-grid gap-2 mt-4">
                    <button type="submit" disabled={isProcessing} class="btn btn-primary btn-start w-100 mb-2">
                      {#if isProcessing}
                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...
                      {:else}
                        Pay {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(registrationFee)} via Remita
                      {/if}
                    </button>
                  </div>
                </form>
              {:else}
                <!-- Step 2 -->
                <form on:submit|preventDefault={handleCategoryPayment}>
                  <div class="row">
                    <div class="col-md-6 form-group mb-4">
                      <label class="form-control-label">CAC Number</label>
                      <input bind:value={cacNumber} required type="text" class="form-control" placeholder="RC-123456">
                    </div>
                    <div class="col-md-6 form-group mb-4">
                      <label class="form-control-label">TIN</label>
                      <input bind:value={tin} required type="text" class="form-control" placeholder="TIN Number">
                    </div>
                  </div>
                  
                  <div class="form-group mb-4">
                    <label class="form-control-label">Company Category</label>
                    <select bind:value={category} required class="form-control form-select">
                      {#each categoriesData as cat}
                        <option value={cat.name}>{cat.code} - {cat.name}</option>
                      {/each}
                    </select>
                  </div>
    
                  <div class="form-group mb-4">
                    <label class="form-control-label">Physical Address</label>
                    <textarea bind:value={locationAddress} required class="form-control" rows="2" placeholder="123 Main Street..."></textarea>
                  </div>
    
                  <div class="form-group mb-4">
                    <label class="form-control-label">Postal Address</label>
                    <textarea bind:value={postalAddress} required class="form-control" rows="2" placeholder="P.O. Box 123..."></textarea>
                  </div>
    
                  <hr class="my-4" style="border-top: 1px dashed #ccc;">
                  
                  <div class="form-group mb-4">
                    <label class="form-control-label">Create Password</label>
                    <div class="pass-group">
                      <input bind:value={password} required type="password" class="form-control pass-input" placeholder="Enter secure password">
                      <span class="fas fa-eye toggle-password"></span>
                    </div>
                  </div>
    
                  <div class="d-grid gap-2 mt-4">
                    <button type="submit" disabled={isProcessing} class="btn btn-success btn-start w-100 text-white mb-2">
                      {#if isProcessing}
                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...
                      {:else}
                        Pay {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(categoryFee)} & Complete Setup
                      {/if}
                    </button>
                  </div>
                </form>
              {/if}
    
              <div class="text-center dont-have mt-4">
                Already have an account? <a href="{BASE_PATH}/login" on:click|preventDefault={() => navigate('/login')}>Sign In</a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<style>
  .login-body {
    background-color: #fff;
  }
  .relative-bg {
    background-color: #FEEEF0 !important;
  }
  .info-content {
    max-width: 600px;
    width: 100%;
  }
  .loginbox {
    width: 100%;
    background-color: #fff;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 0 25px rgba(0,0,0,0.06);
  }
  .form-control-label {
    font-weight: 500;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
  }
  .pass-group {
    position: relative;
  }
  .toggle-password {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #666;
  }
  .btn-start {
    padding: 12px;
    font-weight: 600;
    border-radius: 6px;
    font-size: 15px;
  }
  .dont-have a {
    color: #FF4667;
    font-weight: 600;
  }
  .dont-have a:hover {
    color: #e03554;
  }
  h1 {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 10px;
    color: #212529;
  }
  .text-xs { font-size: 12px; }
  .text-sm { font-size: 14px; }
</style>
