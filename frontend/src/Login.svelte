<script lang="ts">
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { LOGO_URL, BASE_PATH } from "./constants";

  let notices: any[] = [];

  onMount(() => {
    // Attempt to clear backend HTTP-Only cookies whenever the login page loads
    fetch(import.meta.env.VITE_API_URL + '/api/logout', { 
        method: 'POST', 
        credentials: 'include' 
    }).catch(e => console.error("Logout request failed:", e));

    // Fetch public notices for the index page
    fetch(import.meta.env.VITE_API_URL + '/api/notices')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          notices = data.data;
        }
      }).catch(e => console.error("Failed to load notices:", e));
  });

  let identifier = ""; // Email for contractor, Username for admin
  let password = "";
  let keepLoggedIn = false;
  let loading = false;
  let error = "";

  const handleLogin = async () => {
    loading = true;
    error = "";
    try {
      // 1. Try Contractor Login
      let response = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/login', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
      });

      let data = await response.json();

      if (response.ok && (data.success || data.token)) {
        // Success: Contractor
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role || 'contractor');
        navigate("/contractor/dashboard");
        setTimeout(() => window.location.reload(), 100);
        return;
      }

      // 2. If Contractor fails, try Admin Login
      response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/login', {
        method: 'POST',
        credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password })
      });

      data = await response.json();

      if (response.ok && (data.success || data.token)) {
        // Success: Admin
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role || 'admin');
        navigate("/admin/dashboard");
        setTimeout(() => window.location.reload(), 100);
        return;
      }

      // If both fail
      error = "Invalid email, username, or password.";
      
    } catch (err) {
      console.error("Login error:", err);
      error = "An error occurred during login. Is the server running?";
    } finally {
      loading = false;
    }
  };
</script>

<div class="main-wrapper login-body">
  <div class="container-fluid px-0">
    <div class="row g-0 min-vh-100">
      
      <!-- Left Side Info Area -->
      <div class="col-lg-6 d-none d-lg-flex flex-column justify-content-start bg-light border-end relative-bg px-0 pt-3 overflow-x-hidden overflow-y-auto" style="height: 100vh;">
        <!-- Top Section -->
        <div class="info-content col-11 me-auto ps-4 pe-0 mb-3 pb-2 mt-2">
          <div class="text-center mb-2 pe-4">
            <img src={LOGO_URL} alt="Logo" style="max-height: 60px;">
          </div>
          <h3 class="fw-bold mb-3 text-center" style="color: #FF4667;">WELCOME BACK!</h3>
          
          <div class="bg-white p-4 rounded shadow-sm text-start mt-4 w-100">
            <h5 class="text-dark fw-bold mb-4" style="font-size: 18px;">Your Contractor Portal:</h5>
            <p class="text-muted mb-4" style="font-size: 17px; line-height: 1.6;">
              Access your dashboard to manage your profile, track registrations, and view the latest project opportunities.
            </p>
            <ul class="list-unstyled text-start text-muted mb-0" style="font-size: 17px; line-height: 1.6;">
              <li class="mb-3 d-flex align-items-start"><i class="isax isax-tick-circle text-primary fs-20 me-3 mt-1"></i> <span>Track application status securely</span></li>
              <li class="mb-3 d-flex align-items-start"><i class="isax isax-tick-circle text-primary fs-20 me-3 mt-1"></i> <span>Update your professional credentials</span></li>
              <li class="d-flex align-items-start"><i class="isax isax-tick-circle text-primary fs-20 me-3 mt-1"></i> <span>Connect directly with clients</span></li>
            </ul>
          </div>
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
          <div class="loginbox mx-auto p-5" style="max-width: 500px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.6); border-radius: 1.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
            <div class="w-100">
              <!-- Mobile Logo -->
              <div class="img-logo text-center mb-4 d-lg-none">
                <img src={LOGO_URL} class="img-fluid" alt="Logo" style="max-height: 60px;">
              </div>
              
              <h1 class="text-center">Sign into Your Account</h1>
              <div class="reset-password text-center mb-4">
                <p class="mb-0">Please enter your details to sign in.</p>
              </div>
              
              {#if error}
                <div class="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              {/if}

              <form on:submit|preventDefault={handleLogin}>
                
                <div class="form-group mb-4">
                  <label class="form-control-label fw-medium" for="identifier">Email or Username</label>
                  <input type="text" id="identifier" class="form-control" bind:value={identifier} required placeholder="Enter your email or username" />
                </div>
                
                <div class="form-group mb-4">
                  <label class="form-control-label" for="password">Password</label>
                  <div class="pass-group">
                    <input type="password" id="password" class="form-control pass-input" bind:value={password} required placeholder="Enter your password" />
                    <span class="fas fa-eye toggle-password"></span>
                  </div>
                </div>
                
                <div class="form-check remember-me mb-4 d-flex justify-content-between">
                  <div>
                    <input class="form-check-input" type="checkbox" id="remember" bind:checked={keepLoggedIn}>
                    <label class="form-check-label mb-0" for="remember">Remember me</label>
                  </div>
                  <a href="#!" class="forgot-link">Forgot Password?</a>
                </div>
                
                <div class="d-grid mb-4">
                  <button class="btn btn-primary btn-start" type="submit" disabled={loading}>
                    {#if loading}
                      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing In...
                    {:else}
                      Sign In
                    {/if}
                  </button>
                </div>
                <div class="text-center dont-have mt-4">
                  Don't have an account? <a href="{BASE_PATH}/registration" on:click|preventDefault={() => navigate('/registration')}>Register here</a>
                </div>
              </form>
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
    max-width: 500px;
  }
  .loginbox {
    width: 100%;
    max-width: 500px;
    background-color: #fff;
  }
  .form-control-label {
    font-weight: 500;
    margin-bottom: 8px;
    color: #333;
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
  }
  .google-bg {
    position: relative;
  }
  .google-bg::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
    background: #e9ecef;
    z-index: 1;
  }
  .google-bg span {
    background: #fff;
    padding: 0 15px;
    position: relative;
    z-index: 2;
    color: #6c757d;
  }
  .dont-have a {
    color: #FF4667;
    font-weight: 600;
  }
  .dont-have a:hover {
    color: #e03554;
  }
  h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 10px;
  }
</style>
