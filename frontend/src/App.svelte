<script lang="ts">
  import { Router, Route } from "svelte-routing";
  import Login from './Login.svelte';
  import Registration from './Registration.svelte';
  import AdminLiteLayout from './AdminLiteLayout.svelte';
  import ContractorLayout from './ContractorLayout.svelte';
  import ContractorDashboard from './ContractorDashboard.svelte';
  import VerificationCenter from './VerificationCenter.svelte';
  import AdminDashboard from './AdminDashboard.svelte';
  import AdminPayments from './AdminPayments.svelte';
  import ContractorList from './ContractorList.svelte';
  import ContractorPayments from './ContractorPayments.svelte';
  import PricingCMS from './PricingCMS.svelte';
  import Profile from './Profile.svelte';
  import Messages from './Messages.svelte';
  import ComingSoon from './ComingSoon.svelte';
  import Documents from './Documents.svelte';
  import AdminVerification from './AdminVerification.svelte';
  import AdminNotices from './AdminNotices.svelte';
  import SuperAdminStaff from './SuperAdminStaff.svelte';
  import SuperAdminDisputes from './SuperAdminDisputes.svelte';

  export let url = "";
  const basepath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";
</script>

<Router {url} {basepath}>
  <Route path="/">
    <Login />
  </Route>
  <Route path="/login">
    <Login />
  </Route>
  <Route path="/register">
    <Registration />
  </Route>
  <Route path="/registration">
    <Registration />
  </Route>

  <Route path="/profile">
    <AdminLiteLayout><Profile /></AdminLiteLayout>
  </Route>
  
  <!-- Contractor Routes -->
  <Route path="/contractor">
    <ContractorLayout><ContractorDashboard /></ContractorLayout>
  </Route>
  <Route path="/contractor/dashboard">
    <ContractorLayout><ContractorDashboard /></ContractorLayout>
  </Route>
  <Route path="/dashboard">
    <ContractorLayout><ContractorDashboard /></ContractorLayout>
  </Route>
  <Route path="/contractor/profile">
    <ContractorLayout><Profile /></ContractorLayout>
  </Route>
  <Route path="/contractor/verification">
    <ContractorLayout><VerificationCenter /></ContractorLayout>
  </Route>
  <Route path="/verification">
    <ContractorLayout><VerificationCenter /></ContractorLayout>
  </Route>
  <Route path="/contractor/messages">
    <ContractorLayout><Messages /></ContractorLayout>
  </Route>
  <Route path="/messages">
    <ContractorLayout><Messages /></ContractorLayout>
  </Route>
  <Route path="/contractor/documents">
    <ContractorLayout><Documents /></ContractorLayout>
  </Route>
  <Route path="/documents">
    <ContractorLayout><Documents /></ContractorLayout>
  </Route>
  <Route path="/contractor/settings">
    <ContractorLayout><ComingSoon /></ContractorLayout>
  </Route>
  <Route path="/settings">
    <ContractorLayout><ComingSoon /></ContractorLayout>
  </Route>
  <Route path="/contractor/payments">
    <ContractorLayout><ContractorPayments /></ContractorLayout>
  </Route>
  <Route path="/payments">
    <ContractorLayout><ContractorPayments /></ContractorLayout>
  </Route>

  <!-- Admin Routes -->
  <Route path="/admin">
    <AdminLiteLayout><AdminDashboard /></AdminLiteLayout>
  </Route>
  <Route path="/admin/dashboard">
    <AdminLiteLayout><AdminDashboard /></AdminLiteLayout>
  </Route>
  <Route path="/admin/payments">
    <AdminLiteLayout><AdminPayments /></AdminLiteLayout>
  </Route>
  <Route path="/admin/notices">
    <AdminNotices />
  </Route>
  <Route path="/admin/contractors">
    <AdminLiteLayout><ContractorList /></AdminLiteLayout>
  </Route>
  <Route path="/admin/pricing">
    <AdminLiteLayout><PricingCMS /></AdminLiteLayout>
  </Route>
  <Route path="/admin/verification">
    <AdminLiteLayout><AdminVerification /></AdminLiteLayout>
  </Route>
  <Route path="/admin/messages">
    <AdminLiteLayout><Messages /></AdminLiteLayout>
  </Route>

  <!-- Super Admin Routes -->
  <Route path="/superadmin/staff">
    <AdminLiteLayout><SuperAdminStaff /></AdminLiteLayout>
  </Route>
  <Route path="/superadmin/disputes">
    <AdminLiteLayout><SuperAdminDisputes /></AdminLiteLayout>
  </Route>

  <!-- Fallback Route -->
  <Route path="*">
    <div style="text-align: center; padding: 100px;">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" style="color: blue; text-decoration: underline;">Go Home</a>
    </div>
  </Route>
</Router>
