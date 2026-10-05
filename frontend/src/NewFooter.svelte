<script lang="ts">
  import { LOGO_URL, BASE_PATH } from "./constants";
  import { navigate } from "svelte-routing";
  const currentYear = new Date().getFullYear();
</script>

<!-- Footer -->
<footer class="footer">
    <div class="footer-bg">
        <img src="{BASE_PATH}/assets/img/bg/footer-bg-01.png" class="footer-bg-1" alt="">
        <img src="{BASE_PATH}/assets/img/bg/footer-bg-02.png" class="footer-bg-2" alt="">
    </div>
    <div class="footer-top">
        <div class="container">
            <div class="row row-gap-4">
                <div class="col-lg-4">
                    <div class="footer-about">
                        <div class="footer-logo">
                            <img src={LOGO_URL} alt="Logo" style="height: 50px; object-fit: contain;">
                        </div>
                        <p>Platform designed to help contractors and Edo State University manage and track construction projects and verifications efficiently.</p>
                    </div>
                </div>
                <div class="col-lg-8">
                    <div class="row row-gap-4">
                        <div class="col-lg-4">
                            <div class="footer-widget footer-menu">
                                <h5 class="footer-title">Quick Links</h5>
                                <ul>
                                    <li><a href="{BASE_PATH}/" on:click|preventDefault={() => navigate('/')}>Home</a></li>
                                    <li><a href="{BASE_PATH}/login" on:click|preventDefault={() => navigate('/login')}>Login</a></li>
                                    <li><a href="{BASE_PATH}/registration" on:click|preventDefault={() => navigate('/registration')}>Register</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-lg-8">
                            <div class="footer-widget footer-contact">
                                <h5 class="footer-title">Contact Us</h5>
                                <div class="footer-contact-info">
                                    <div class="footer-address d-flex align-items-center mb-3">
                                        <i class="isax isax-location5 text-primary fs-24 me-3"></i>
                                        <p class="mb-0"> Edo State University Uzairue,<br> Edo State, Nigeria </p>
                                    </div>
                                    <div class="footer-address d-flex align-items-center mb-3">
                                        <i class="isax isax-sms text-primary fs-24 me-3"></i>
                                        <p class="mb-0">support@edouniversity.edu.ng</p>
                                    </div>
                                    <div class="footer-address d-flex align-items-center">
                                        <i class="isax isax-call-calling5 text-primary fs-24 me-3"></i>
                                        <p class="mb-0">+234 800 000 0000</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="footer-bottom">
        <div class="container">
            <div class="row row-gap-2">
                <div class="col-md-6">
                    <div class="text-center text-md-start">
                        <p class="text-white">Copyright &copy; {currentYear} Edo State University Uzairue. All rights reserved.</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div>
                        <ul class="d-flex align-items-center justify-content-center justify-content-md-end footer-link">
                            <li><a href="#!">Terms & Conditions</a></li>
                            <li><a href="#!">Privacy Policy</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</footer>
<!-- /Footer -->
