import { auth } from '@/firebase';
import {
  customerAccess,
  getUserAccess,
  hasAnyPermission,
  hasEveryPermission,
  hasPermission
} from '@/utils/accessControl';

export default {
  data() {
    return {
      userAccess: customerAccess(),
      accessLoading: true
    };
  },
  async created() {
    await this.loadUserAccess();
  },
  methods: {
    async loadUserAccess(force = false) {
      this.accessLoading = true;
      try {
        this.userAccess = auth.currentUser
          ? await getUserAccess(auth.currentUser.uid, { force })
          : customerAccess();
      } catch (error) {
        console.error('Unable to load user access:', error);
        this.userAccess = customerAccess(auth.currentUser?.uid || '');
      } finally {
        this.accessLoading = false;
      }
      return this.userAccess;
    },
    can(permission) {
      return hasPermission(this.userAccess, permission);
    },
    canAny(permissions) {
      return hasAnyPermission(this.userAccess, permissions);
    },
    canAll(permissions) {
      return hasEveryPermission(this.userAccess, permissions);
    }
  }
};
