import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout from '@/layouts/AdminLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { DashboardProvider } from '@/providers/DashboardProvider';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'));
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const DirectoryPage = lazy(() => import('@/pages/directory/DirectoryPage'));
const CategoryPage = lazy(() => import('@/pages/category/CategoryPage'));
const BusinessProfilePage = lazy(() => import('@/pages/business/BusinessProfilePage'));
const SearchPage = lazy(() => import('@/pages/search/SearchPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const OnboardingPage = lazy(() => import('@/pages/dashboard/OnboardingPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const HoursPage = lazy(() => import('@/pages/dashboard/HoursPage'));
const ContactsPage = lazy(() => import('@/pages/dashboard/ContactsPage'));
const ProductsPage = lazy(() => import('@/pages/dashboard/ProductsPage'));
const ServicesPage = lazy(() => import('@/pages/dashboard/ServicesPage'));
const PortfolioPage = lazy(() => import('@/pages/dashboard/PortfolioPage'));
const ReviewsPage = lazy(() => import('@/pages/dashboard/ReviewsPage'));
const UpdatesPage = lazy(() => import('@/pages/dashboard/UpdatesPage'));
const BranchesPage = lazy(() => import('@/pages/dashboard/BranchesPage'));
const ServiceAreasPage = lazy(() => import('@/pages/dashboard/ServiceAreasPage'));
const VerificationPage = lazy(() => import('@/pages/dashboard/VerificationPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminBusinessesPage = lazy(() => import('@/pages/admin/AdminBusinessesPage'));
const AdminClaimsPage = lazy(() => import('@/pages/admin/AdminClaimsPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const SavedItemsPage = lazy(() => import('@/pages/SavedItemsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';

export const router = createBrowserRouter(
  [
    {
      path: '/403',
      element: withSuspense(ForbiddenPage),
    },
    {
      path: '/404',
      element: withSuspense(NotFoundPage),
    },
    {
      element: <AuthLayout />,
      children: [
        { path: '/login', element: withSuspense(LoginPage) },
        { path: '/register', element: withSuspense(RegisterPage) },
        { path: '/verify-email', element: withSuspense(VerifyEmailPage) },
      ],
    },
    {
      element: <RootLayout />,
      children: [
        {
          path: '/',
          element: withSuspense(HomePage),
        },
        {
          path: '/directory',
          element: withSuspense(DirectoryPage),
        },
        {
          path: '/search',
          element: withSuspense(SearchPage),
        },
        {
          path: '/business/:slug',
          element: withSuspense(BusinessProfilePage),
        },
        {
          path: '/category/:slug',
          element: withSuspense(CategoryPage),
        },
        {
          element: <RequireAuth />,
          children: [
            {
              path: '/saved',
              element: withSuspense(SavedItemsPage),
            },
            {
              path: '/notifications',
              element: withSuspense(NotificationsPage),
            },
          ],
        },
      ],
    },
    {
      element: <RequireAuth />,
      children: [
        {
          element: (
            <DashboardProvider>
              <DashboardLayout />
            </DashboardProvider>
          ),
          children: [
            {
              path: '/dashboard',
              element: withSuspense(DashboardPage),
            },
            {
              path: '/dashboard/onboarding',
              element: withSuspense(OnboardingPage),
            },
            {
              path: '/dashboard/profile',
              element: withSuspense(ProfilePage),
            },
            {
              path: '/dashboard/hours',
              element: withSuspense(HoursPage),
            },
            {
              path: '/dashboard/contacts',
              element: withSuspense(ContactsPage),
            },
            {
              path: '/dashboard/products',
              element: withSuspense(ProductsPage),
            },
            {
              path: '/dashboard/services',
              element: withSuspense(ServicesPage),
            },
            {
              path: '/dashboard/portfolio',
              element: withSuspense(PortfolioPage),
            },
            {
              path: '/dashboard/reviews',
              element: withSuspense(ReviewsPage),
            },
            {
              path: '/dashboard/updates',
              element: withSuspense(UpdatesPage),
            },
            {
              path: '/dashboard/branches',
              element: withSuspense(BranchesPage),
            },
            {
              path: '/dashboard/service-areas',
              element: withSuspense(ServiceAreasPage),
            },
            {
              path: '/dashboard/verification',
              element: withSuspense(VerificationPage),
            },
          ],
        },
      ],
    },
    {
      element: (
        <RequireRole
          roles={['marketplace_admin', 'marketplace_moderator', 'marketplace_analyst']}
        />
      ),
      children: [
        {
          element: <AdminLayout />,
          children: [
            {
              path: '/admin',
              element: withSuspense(AdminDashboardPage),
            },
            {
              path: '/admin/businesses',
              element: withSuspense(AdminBusinessesPage),
            },
            {
              path: '/admin/claims',
              element: withSuspense(AdminClaimsPage),
            },
            {
              path: '/admin/reviews',
              element: withSuspense(AdminReviewsPage),
            },
            {
              path: '/admin/analytics',
              element: withSuspense(AdminAnalyticsPage),
            },
          ],
        },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ],
  { basename },
);
