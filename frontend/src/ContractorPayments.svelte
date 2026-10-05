<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { LOGO_URL } from './constants';

  let payments: any[] = [];
  let loading = true;
  let error = '';

  async function fetchPayments() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'contractor') {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/contractor/payments', {
        credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        payments = data.data;
      } else {
        error = data.error || 'Failed to fetch payments';
      }
    } catch (err: any) {
      error = err.message || 'Network error';
    } finally {
      loading = false;
    }
  }

  onMount(fetchPayments);

  function getStatusColor(status: string) {
    switch(status) {
      case 'successful': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  }

  function printAllRecords() {
    window.print();
  }

  function printReceipt(payment: any) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    if (!iframe.contentWindow) return;
    
    const doc = iframe.contentWindow.document;
    const amountStr = parseFloat(payment.amount).toLocaleString();
    const dateStr = new Date(payment.created_at).toLocaleDateString();
    const timeStr = new Date(payment.created_at).toLocaleTimeString();
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${payment.transaction_id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              padding: 40px; 
              color: #333; 
              position: relative;
              margin: 0;
              min-height: 100vh;
              overflow: hidden;
            }
            .watermark-img {
              position: absolute; 
              top: 0; left: 0; right: 0; bottom: 0;
              z-index: -2; 
              opacity: 0.05;
              background-image: url('${window.location.origin}${LOGO_URL}');
              background-repeat: no-repeat; 
              background-position: center; 
              background-size: 50%;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .watermark-text {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 50px;
              color: rgba(0, 0, 0, 0.08);
              font-weight: 900;
              text-align: center;
              white-space: nowrap;
              z-index: -1;
              pointer-events: none;
              text-transform: uppercase;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .header { text-align: center; margin-bottom: 40px; }
            .header img { height: 100px; margin-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; font-weight: bold; font-size: 24px; }
            .header h4 { margin: 0; color: #666; font-size: 16px; font-weight: normal; }
            
            .meta { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .meta p { margin: 3px 0; font-size: 14px; }
            .meta-label { color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px !important; }
            .meta h5 { margin: 0 0 5px 0; font-size: 16px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; background: #f8f9fa; font-size: 14px; }
            th.right { text-align: right; }
            td { padding: 15px 12px; border-bottom: 1px solid #eee; }
            td.right { text-align: right; font-weight: bold; font-size: 16px; }
            
            .total-row { display: flex; justify-content: flex-end; margin-bottom: 50px; }
            .total-box { width: 300px; display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #333; }
            
            .footer { text-align: center; color: #777; font-size: 12px; margin-top: 50px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="watermark-img"></div>
          <div class="watermark-text">EDO STATE UNIVERSITY, IYAMHO<br>CONTRACTOR SYSTEM</div>
          
          <div class="header">
            <img src="${window.location.origin}${LOGO_URL}" alt="Edo State University Logo">
            <h2>Edo State University, Iyamho</h2>
            <h4>Official Payment Receipt</h4>
          </div>
          
          <div class="meta">
            <div>
              <p class="meta-label">Billed To</p>
              <h5>${payment.company_name}</h5>
              <p>${payment.email}</p>
              <p>${payment.phone}</p>
            </div>
            <div style="text-align: right;">
              <p class="meta-label">Receipt Details</p>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
              <p><strong>Status:</strong> <span style="text-transform: uppercase;">${payment.status}</span></p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style="display: block; margin-bottom: 5px; text-transform: capitalize;">${payment.payment_type} Fee</strong>
                  <span style="font-size: 13px; color: #666;">Trans ID: ${payment.transaction_id}</span><br>
                  <span style="font-size: 13px; color: #666;">RRR: ${payment.rrr || 'N/A'}</span>
                </td>
                <td class="right">₦${amountStr}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-row">
            <div class="total-box">
              <span>Total Paid:</span>
              <span>₦${amountStr}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your payment.<br>If you have any questions concerning this receipt, contact support.</p>
          </div>
        </body>
      </html>
    `;
    
    doc.open();
    doc.write(html);
    doc.close();
    
    // Give the iframe enough time to load the image logo before printing
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Cleanup after print dialog closes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 500);
  }
</script>

<style>
  @media print {
    :global(body *){
      visibility: hidden;
    }
    
    .print-all-section, .print-all-section * {
      visibility: visible;
    }
    .print-all-section {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    
    .no-print {
      display: none !important;
    }
  }
</style>

<div class="row">
  <div class="col-12">
    <div class="card mb-4 print-all-section">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h4 class="card-title">My Transaction Records</h4>
          <p class="text-muted mb-0">View and print all your platform payments.</p>
        </div>
        <div class="d-flex align-items-center mt-3 mt-md-0 gap-3 no-print">
          <button class="btn btn-primary shadow" on:click={printAllRecords}>
            <i class="fas fa-print me-2"></i> Print All Records
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        {#if loading}
          <div class="d-flex justify-content-center align-items-center p-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        {:else if error}
          <div class="alert alert-danger m-4">{error}</div>
        {:else}
          <div class="table-responsive">
            <table class="table table-responsive-md text-black mb-0">
              <thead class="bg-light">
                <tr>
                  <th>Type</th>
                  <th>Transaction ID</th>
                  <th>Reference (RRR)</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th class="no-print text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {#each payments as payment}
                  <tr>
                    <td><span class="badge badge-primary light border-0 text-uppercase">{payment.payment_type}</span></td>
                    <td><span class="text-black font-monospace">{payment.transaction_id}</span></td>
                    <td><span class="text-black font-w500">{payment.rrr || 'N/A'}</span></td>
                    <td><strong class="text-black">₦{parseFloat(payment.amount).toLocaleString()}</strong></td>
                    <td>
                      <span class="d-block text-black">{new Date(payment.created_at).toLocaleDateString()}</span>
                      <span class="fs-12 text-muted">{new Date(payment.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td>
                      <span class="badge {payment.status === 'successful' ? 'badge-success' : payment.status === 'failed' ? 'badge-danger' : 'badge-warning'} light border-0">
                        {payment.status}
                      </span>
                    </td>
                    <td class="no-print text-end">
                      <button class="btn btn-outline-primary btn-sm rounded-pill" on:click={() => printReceipt(payment)} title="Print Receipt">
                        <i class="fas fa-file-invoice"></i> Receipt
                      </button>
                    </td>
                  </tr>
                {:else}
                  <tr>
                    <td colspan="7" class="text-center p-4">No payment records found.</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
