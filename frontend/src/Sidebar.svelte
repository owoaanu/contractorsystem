<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { io } from 'socket.io-client';
  import { Toast } from './utils/alert';

  let role = '';
  let unreadCount = 0;
  let currentPath = window.location.pathname;

  onMount(() => {
    role = localStorage.getItem('role') || '';
    if (role) {
        fetchUnreadCount();
        setupSocket();
    }
    
    // Listen for custom event from Messages component
    window.addEventListener('unreadMessagesUpdate', (e: any) => {
      unreadCount = e.detail.count;
    });

    // Simple listener for popstate to update active states
    window.addEventListener('popstate', () => {
      currentPath = window.location.pathname;
    });
  });

  function setupSocket() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const room = `${role}_${payload.id}`;
          
          const apiUrl = import.meta.env.VITE_API_URL || '';
          const isAbsolute = apiUrl.startsWith('http');
          const socket = isAbsolute 
              ? io(apiUrl, { path: '/socket.io' }) 
              : io({ path: (apiUrl.replace(/\/$/, '') || '') + '/socket.io' });
          socket.on('connect', () => {
              socket.emit('join', room);
          });

          socket.on('newMessage', (data) => {
              fetchUnreadCount(); // update badge
              Toast.fire({ icon: 'info', title: `New Message: ${data.subject}` });
          });
      } catch (e) {
          console.error('Failed to setup socket', e);
      }
  }

  // Wrapper for navigate to also update currentPath
  function navTo(path: string) {
      navigate(path);
      currentPath = path;
  }

  async function fetchUnreadCount() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/messages/unread-count', {
        credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        unreadCount = data.count;
      }
    } catch (err) {
      console.error(err);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.replace('/login');
  }

</script>

<!--**********************************
            Sidebar start
        ***********************************-->
        <div class="deznav">
            <div class="deznav-scroll">
				<ul class="metismenu" id="menu">
                    {#if role === 'admin'}
                    <li class="mm-active"><a class="has-arrow ai-icon" href="#!" aria-expanded="true">
							<i class="flaticon-025-dashboard"></i>
							<span class="nav-text">Dashboard</span>
						</a>
						<ul aria-expanded="true" class="mm-show">
							<li class={currentPath === '/admin/dashboard' ? 'mm-active' : ''}><a href="/admin/dashboard" class={currentPath === '/admin/dashboard' ? 'mm-active' : ''} on:click|preventDefault={() => navTo('/admin/dashboard')}>Dashboard</a></li>
							<li class={currentPath === '/admin/contractors' ? 'mm-active' : ''}><a href="/admin/contractors" class={currentPath === '/admin/contractors' ? 'mm-active' : ''} on:click|preventDefault={() => navTo('/admin/contractors')}>Contractors List</a></li>
							<li class={currentPath === '/admin/pricing' ? 'mm-active' : ''}><a href="/admin/pricing" class={currentPath === '/admin/pricing' ? 'mm-active' : ''} on:click|preventDefault={() => navTo('/admin/pricing')}>Pricing & Fees</a></li>
						</ul>
					</li>
                    <li class={currentPath === '/admin/messages' ? 'mm-active' : ''}><a href="/admin/messages" class="ai-icon" aria-expanded="false" on:click|preventDefault={() => navTo('/admin/messages')}>
							<i class="flaticon-381-envelope"></i>
							<span class="nav-text">Messages
                                {#if unreadCount > 0}
                                    <span class="badge badge-xs badge-danger ms-2">{unreadCount}</span>
                                {/if}
                            </span>
						</a>
					</li>
                    {:else if role === 'contractor'}
                    <li class={currentPath === '/contractor/dashboard' ? 'mm-active' : ''}><a href="/contractor/dashboard" class="ai-icon" aria-expanded="false" on:click|preventDefault={() => navTo('/contractor/dashboard')}>
							<i class="flaticon-025-dashboard"></i>
							<span class="nav-text">Dashboard</span>
						</a>
					</li>
                    <li class={currentPath === '/contractor/verification' ? 'mm-active' : ''}><a href="/contractor/verification" class="ai-icon" aria-expanded="false" on:click|preventDefault={() => navTo('/contractor/verification')}>
							<i class="flaticon-381-file"></i>
							<span class="nav-text">Verification</span>
						</a>
					</li>
                    <li class={currentPath === '/contractor/messages' ? 'mm-active' : ''}><a href="/contractor/messages" class="ai-icon" aria-expanded="false" on:click|preventDefault={() => navTo('/contractor/messages')}>
							<i class="flaticon-381-envelope"></i>
							<span class="nav-text">Messages
                                {#if unreadCount > 0}
                                    <span class="badge badge-xs badge-danger ms-2">{unreadCount}</span>
                                {/if}
                            </span>
						</a>
					</li>
                    {/if}
                    <li><a href="#!" class="ai-icon" aria-expanded="false" on:click|preventDefault={logout}>
							<i class="flaticon-381-exit-2 text-danger"></i>
							<span class="nav-text text-danger">Logout</span>
						</a>
					</li>
                </ul>
			</div>
        </div>
        <!--**********************************
            Sidebar end
        ***********************************-->
