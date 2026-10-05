<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { LOGO_URL } from "./constants";

  let loggedIn = false;
  let user = { role: 'contractor', name: 'User' };
  let isDarkMode = false;

  onMount(() => {
    isDarkMode = localStorage.getItem('darkMode') === 'enabled' || document.documentElement.classList.contains('dark-mode');
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token) {
      loggedIn = true;
      user.role = role || 'contractor';
    }
  });

  function toggleTheme(mode) {
    isDarkMode = mode === 'dark';
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
      document.documentElement.setAttribute('data-theme-mode', 'dark');
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.classList.add('light-mode');
      document.documentElement.setAttribute('data-theme-mode', 'light');
      document.documentElement.setAttribute('data-bs-theme', 'light');
      localStorage.setItem('darkMode', 'disabled');
    }
  }

  function handleLogout() {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      loggedIn = false;
      window.location.replace("/login");
      
  }

  function goToDashboard() {
      if (user.role === 'admin' || user.role === 'super_admin') {
          navigate("/admin/dashboard");
      } else {
          navigate("/contractor/dashboard");
      }
  }
</script>

<header class="header-two"> 
    <div class="container">
        <div class="header-nav">
            <div class="navbar-header">
                <a id="mobile_btn" href="#!">
                    <span class="bar-icon">
                        <i class="isax isax-menu"></i>
                    </span>
                </a>
                <div class="navbar-logo">
                    <a class="logo-white header-logo" href="#!" on:click|preventDefault={goToDashboard}>
                        <img src={LOGO_URL} class="logo" alt="Logo" style="max-height: 50px; object-fit: contain;">
                    </a>
                    <a class="logo-dark header-logo" href="#!" on:click|preventDefault={goToDashboard}>
                        <img src={LOGO_URL} class="logo" alt="Logo" style="max-height: 50px; object-fit: contain;">
                    </a>
                </div>
            </div>
            <div class="main-menu-wrapper">								
                <div class="menu-header">
                    <a href="#!" class="menu-logo" on:click|preventDefault={goToDashboard}>
                        <img src={LOGO_URL} class="img-fluid" alt="Logo" style="max-height: 50px; object-fit: contain;">
                    </a>
                    <a id="menu_close" class="menu-close" href="#!">
                        <i class="fas fa-times"></i>
                    </a>
                </div>
                
                <ul class="main-nav">
                </ul>
                
                <div class="menu-login">
                    {#if !loggedIn}
                        <a href="/login" class="btn btn-primary w-100 mb-2" on:click|preventDefault={() => navigate('/login')}><i class="isax isax-user me-2"></i>Sign In</a>
                        <a href="/registration" class="btn btn-secondary w-100" on:click|preventDefault={() => navigate('/registration')}><i class="isax isax-user-edit me-2"></i>Register</a>
                    {:else}
                        <a href="#!" class="btn btn-primary w-100 mb-2" on:click|preventDefault={goToDashboard}><i class="isax isax-category me-2"></i>Dashboard</a>
                        <a href="#!" class="btn btn-danger w-100" on:click|preventDefault={handleLogout}><i class="isax isax-logout me-2"></i>Logout</a>
                    {/if}
                </div>
            </div>
            <div class="header-btn d-flex align-items-center">							
                <div class="icon-btn me-2">
                    <a href="#!" on:click|preventDefault={() => toggleTheme('dark')} class="theme-toggle {!isDarkMode ? 'activate' : ''}">
                        <i class="isax isax-sun-15"></i>
                    </a>
                    <a href="#!" on:click|preventDefault={() => toggleTheme('light')} class="theme-toggle {isDarkMode ? 'activate' : ''}">
                        <i class="isax isax-moon"></i>
                    </a>
                </div>
                {#if !loggedIn}
                    <a href="/login" class="btn btn-light d-inline-flex align-items-center me-2" on:click|preventDefault={() => navigate('/login')}>
                        <i class="isax isax-lock-circle me-2"></i>Sign In
                    </a>
                    <a href="/registration" class="btn btn-secondary me-0" on:click|preventDefault={() => navigate('/registration')}>
                        <i class="isax isax-user-edit me-2"></i>Register
                    </a>
                {:else}
                    <a href="#!" class="btn btn-light d-inline-flex align-items-center me-2" on:click|preventDefault={goToDashboard}>
                        <i class="isax isax-category me-2"></i>Dashboard
                    </a>
                    <a href="#!" class="btn btn-danger me-0 text-white" on:click|preventDefault={handleLogout}>
                        <i class="isax isax-logout me-2"></i>Logout
                    </a>
                {/if}
            </div>
        </div>
    </div>
</header>
