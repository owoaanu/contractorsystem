<script lang="ts">
    import { onMount } from 'svelte';
    import Swal from 'sweetalert2';
    import { BASE_PATH } from './constants';

    let userRole = '';
    let profileData: any = null;
    let loading = true;
    let updating = false;

    // Form inputs
    let editName = '';
    let editEmail = '';
    let editTelephone = '';
    let editLocationAddress = '';
    let editPostalAddress = '';
    let currentPassword = '';
    let newPassword = '';

    let uploadingImage = false;
    let fileInput: HTMLInputElement;

    onMount(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // Decode role from token payload if possible, or just try fetching
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role;
        } catch (e) {
            userRole = 'admin';
        }

        try {
            if ((userRole === 'admin' || userRole === 'super_admin')) {
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/admin/profile', {
                    credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    profileData = data.admin;
                    editName = profileData.username;
                    editEmail = profileData.email || '';
                }
            } else if (userRole === 'contractor') {
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/me', {
                    credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    profileData = data.data;
                    editName = profileData.company_name;
                    editEmail = profileData.email;
                    editTelephone = profileData.telephone || '';
                    editLocationAddress = profileData.location_address || '';
                    editPostalAddress = profileData.postal_address || '';
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            loading = false;
        }
    });

    async function handleImageUpload(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        uploadingImage = true;
        const formData = new FormData();
        formData.append('profile_pic', file);

        try {
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/upload-profile-pic', {
                method: 'POST',
                credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                profileData.profile_pic = data.profile_pic;
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Profile picture updated',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                Swal.fire('Error', data.error || 'Failed to upload image', 'error');
            }
        } catch (err: any) {
            Swal.fire('Error', err.message || 'Network error', 'error');
        } finally {
            uploadingImage = false;
        }
    }

    async function handleUpdateProfile(e: Event) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return;
        
        updating = true;
        try {
            if ((userRole === 'admin' || userRole === 'super_admin')) {
                const payload: any = { username: editName, email: editEmail };
                if (newPassword) {
                    payload.current_password = currentPassword;
                    payload.new_password = newPassword;
                }
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/admin/update-profile', {
                    method: 'PUT',
                    credentials: 'include',
          headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    Swal.fire('Success', 'Profile updated successfully!', 'success');
                    if (newPassword) {
                        currentPassword = '';
                        newPassword = '';
                    }
                    profileData.username = editName;
                    profileData.email = editEmail;
                } else {
                    Swal.fire('Error', data.error || 'Failed to update profile', 'error');
                }
            } else if (userRole === 'contractor') {
                // First update profile
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/update-profile', {
                    method: 'PUT',
                    credentials: 'include',
          headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        company_name: editName,
                        email: editEmail,
                        telephone: editTelephone,
                        location_address: editLocationAddress,
                        postal_address: editPostalAddress
                    })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to update profile');
                }

                // If password is provided, update password separately
                if (newPassword) {
                    if (!currentPassword) throw new Error('Current password required');
                    const pwRes = await fetch(import.meta.env.VITE_API_URL + '/api/contractors/update-password', {
                        method: 'PUT',
                        credentials: 'include',
          headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            current_password: currentPassword,
                            new_password: newPassword
                        })
                    });
                    const pwData = await pwRes.json();
                    if (!pwRes.ok || !pwData.success) {
                        throw new Error(pwData.error || 'Failed to update password');
                    }
                    currentPassword = '';
                    newPassword = '';
                }

                Swal.fire('Success', 'Profile updated successfully!', 'success');
                profileData.company_name = editName;
                profileData.email = editEmail;
                profileData.telephone = editTelephone;
                profileData.location_address = editLocationAddress;
                profileData.postal_address = editPostalAddress;
            }
        } catch (err: any) {
            Swal.fire('Error', err.message || 'An error occurred', 'error');
        } finally {
            updating = false;
        }
    }
</script>

        {#if loading}
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        {:else if !profileData}
            <div class="alert alert-danger">Failed to load profile data.</div>
        {:else}

			<div class="content mt-4">
				<div class="container">
					<div class="row">
						<div class="col-lg-12">
							<div class="page-title d-flex align-items-center justify-content-between">
								<h5 class="fw-bold">My Profile</h5>
								<a href="#settings" class="edit-profile-icon"><i class="isax isax-edit-2"></i></a>
							</div>
							<div class="card">
								<div class="card-body">
									<h5 class="fs-18 pb-3 border-bottom mb-3">Basic Information</h5>
									<div class="row">
                                        {#if userRole === 'contractor'}
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Company Name</h6>
                                                <span>{profileData.company_name}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Email</h6>
                                                <span>{profileData.email}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Registration Date</h6>
                                                <span>{new Date(profileData.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Phone Number</h6>
                                                <span>{profileData.telephone || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Category</h6>
                                                <span>{profileData.category || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-12">
                                            <div class="mb-3">
                                                <h6>Location Address</h6>
                                                <span>{profileData.location_address || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-12">
                                            <div class="mb-3">
                                                <h6>Postal Address</h6>
                                                <span>{profileData.postal_address || 'N/A'}</span>
                                            </div>
                                        </div>
                                        {#if profileData.corporate_details}
                                        <div class="col-md-12">
                                            <h5 class="fs-18 pb-3 border-bottom mb-3 mt-3">Corporate Information</h5>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Reg No</h6>
                                                <span>{profileData.corporate_details.reg_no}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Reg Date</h6>
                                                <span>{profileData.corporate_details.reg_date}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Reg Place</h6>
                                                <span>{profileData.corporate_details.reg_place}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Paid Up Capital</h6>
                                                <span>{profileData.corporate_details.paid_up_capital}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>CEO Name</h6>
                                                <span>{profileData.corporate_details.ceo_name}</span>
                                            </div>
                                        </div>
                                        {/if}
                                        {:else}
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Username</h6>
                                                <span>{profileData.username}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Email</h6>
                                                <span>{profileData.email}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <h6>Role</h6>
                                                <span class="text-capitalize">{userRole}</span>
                                            </div>
                                        </div>
                                        {/if}
									</div>								
								</div>
							</div>

							<div class="card" id="settings">
								<div class="card-body">
									<h5 class="fs-18 pb-3 border-bottom mb-3">Settings & Profile Update</h5>
                                    
                                    <div class="mb-4 d-flex align-items-center gap-3">
                                        <div class="position-relative" style="width: 80px; height: 80px; cursor:pointer;" on:click={() => fileInput.click()}>
                                            <input type="file" bind:this={fileInput} accept="image/*" class="d-none" on:change={handleImageUpload}>
                                            <img src={profileData.profile_pic ? `${import.meta.env.VITE_API_URL}${profileData.profile_pic}` : `${BASE_PATH}/assets/img/user/user-01.jpg`} alt="img" class="img-fluid rounded-circle w-100 h-100" style="object-fit: cover; background: #eee;">
                                            <div class="position-absolute w-100 h-100 top-0 start-0 d-flex justify-content-center align-items-center rounded-circle" style="background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.3s;" on:mouseenter={(e) => e.currentTarget.style.opacity = '1'} on:mouseleave={(e) => e.currentTarget.style.opacity = '0'}>
                                                {#if uploadingImage}
                                                    <div class="spinner-border text-light spinner-border-sm" role="status"></div>
                                                {:else}
                                                    <i class="isax isax-camera text-light fs-4"></i>
                                                {/if}
                                            </div>
                                        </div>
                                        <div>
                                            <h6 class="mb-1">Profile Picture</h6>
                                            <p class="text-muted small mb-0">Click the image to upload a new avatar</p>
                                        </div>
                                    </div>

                                    <form on:submit={handleUpdateProfile}>
                                        <div class="row">
                                            <div class="mb-3 col-md-6">
                                                <label class="form-label">{(userRole === 'admin' || userRole === 'super_admin') ? 'Username' : 'Company Name'}</label>
                                                <input type="text" placeholder="{(userRole === 'admin' || userRole === 'super_admin') ? 'Username' : 'Company Name'}" class="form-control" bind:value={editName} required>
                                            </div>
                                            <div class="mb-3 col-md-6">
                                                <label class="form-label">Email</label>
                                                <input type="email" placeholder="Email" class="form-control" bind:value={editEmail}>
                                            </div>
                                        </div>
                                        {#if userRole === 'contractor'}
                                        <div class="row">
                                            <div class="mb-3 col-md-6">
                                                <label class="form-label">Telephone</label>
                                                <input type="text" placeholder="Telephone" class="form-control" bind:value={editTelephone}>
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Location Address</label>
                                            <input type="text" placeholder="1234 Main St" class="form-control" bind:value={editLocationAddress}>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Postal Address</label>
                                            <input type="text" placeholder="PO BOX 123" class="form-control" bind:value={editPostalAddress}>
                                        </div>
                                        {/if}

                                        <h5 class="fs-18 border-bottom pb-3 mt-4 mb-3">Change Password</h5>
                                        <p class="text-muted small mb-3">Leave blank to keep current password.</p>
                                        <div class="row">
                                            <div class="mb-3 col-md-6">
                                                <label class="form-label">Current Password</label>
                                                <input type="password" placeholder="Current Password" class="form-control" bind:value={currentPassword}>
                                            </div>
                                            <div class="mb-3 col-md-6">
                                                <label class="form-label">New Password</label>
                                                <input type="password" placeholder="New Password" class="form-control" bind:value={newPassword}>
                                            </div>
                                        </div>
                                        
                                        <button class="btn btn-primary mt-3" type="submit" disabled={updating}>
                                            {#if updating}
                                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...
                                            {:else}
                                                Update Profile
                                            {/if}
                                        </button>
                                    </form>
								</div>
							</div>

						</div>
					</div>
				</div>
			</div>
        {/if}

<style>
    .cover-photo {
        background-size: cover;
        background-position: center;
        border-radius: 0.75rem 0.75rem 0 0;
    }
</style>
