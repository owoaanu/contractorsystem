<script lang="ts">
  import NewHeader from './NewHeader.svelte';
  import ContractorSidebar from './ContractorSidebar.svelte';
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { BASE_PATH } from './constants';

  let contractor = {
      company_name: 'Loading...',
      email: '',
      phone: '',
      status: 'pending'
  };

  onMount(async () => {
      const token = localStorage.getItem('token');
      if (!token) {
          navigate('/login');
          return;
      }

      try {
          const response = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/me', {
              credentials: 'include',
          headers: {
                  'Authorization': `Bearer ${token}`
              }
          });

          if (response.ok) {
              const data = await response.json();
              contractor = data.data;
              contractor.status = contractor.verification_status;
          } else {
              localStorage.removeItem('token');
              localStorage.removeItem('role');
              navigate('/login');
          }
      } catch (error) {
          console.error("Failed to load profile", error);
      }
  });

  // Basic map of path to breadcrumb title
  let pathTitle = 'Dashboard';
  $: {
      const path = window.location.pathname;
      if (path.includes('profile')) pathTitle = 'My Profile';
      else if (path.includes('documents')) pathTitle = 'Documents';
      else if (path.includes('verification')) pathTitle = 'Verification';
      else if (path.includes('messages')) pathTitle = 'Messages';
      else if (path.includes('settings')) pathTitle = 'Settings';
      else pathTitle = 'Dashboard';
  }

  // Reactive token check to instantly defeat back-button caching
  $: {
      if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
          if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/register') {
              window.location.replace('/login');
          }
      }
  }
</script>

<div class="main-wrapper">
  <NewHeader />

  <!-- Breadcrumb -->
  <div class="breadcrumb-bar text-center">
    <div class="container">
      <div class="row">
        <div class="col-md-12 col-12">
          <h2 class="breadcrumb-title mb-2">{pathTitle}</h2>
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb justify-content-center mb-0">
              <li class="breadcrumb-item"><a href="/">Home</a></li>
              <li class="breadcrumb-item active" aria-current="page">{pathTitle}</li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  </div>
  <!-- /Breadcrumb -->

  <div class="content">
    <div class="container">
      <div class="instructor-profile">
        <div class="instructor-profile-bg">
          <img src="{BASE_PATH}/assets/img/bg/card-bg-01.png" class="instructor-profile-bg-1" alt="">
        </div>
        <div class="row align-items-center row-gap-3">
          <div class="col-md-6">
            <div class="d-flex align-items-center">
              <span class="avatar flex-shrink-0 avatar-xxl avatar-rounded me-3 border border-white border-3 position-relative" style="width: 120px; height: 120px;">
                <img src={contractor.profile_pic ? `${import.meta.env.VITE_API_URL}${contractor.profile_pic}` : `${BASE_PATH}/assets/img/user/user-01.jpg`} alt="img" class="img-fluid rounded-circle w-100 h-100" style="object-fit: cover; background: #fff;">
                {#if contractor.status === 'verified' || contractor.status === 'approved'}
                  <span class="verify-tick" style="position: absolute; bottom: 5px; right: 5px; background: #28a745; color: #fff; border-radius: 50%; padding: 2px;"><i class="isax isax-verify5"></i></span>
                {/if}
              </span>
              <div>
                <h5 class="mb-1 text-white d-inline-flex align-items-center">{contractor.company_name}
                  <a href="/contractor/profile" class="link-light fs-16 ms-2"><i class="isax isax-edit-2"></i></a>
                </h5>
                <p class="text-light text-capitalize">{contractor.status} Contractor</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-flex align-items-center flex-wrap gap-3 justify-content-md-end">
              <a href="/contractor/documents" class="btn btn-white rounded-pill">Upload Documents</a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row">
        <!-- Sidebar -->
        <div class="col-lg-3 theiaStickySidebar">
          <ContractorSidebar />
        </div>
        <!-- Main Content -->
        <div class="col-lg-9">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</div>
