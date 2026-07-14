import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

export const useClaimsQueue = (status?: string) => {
  const { apiFetch } = useAuth();
  return useQuery({
    queryKey: ['claims', 'queue', status],
    queryFn: async () => {
      const url = status ? `/api/claims?status=${status}` : '/api/claims';
      const res = await apiFetch(url);
      return res.data || [];
    }
  });
};

export const useClaimDetails = (claimId: string) => {
  const { apiFetch } = useAuth();
  return useQuery({
    queryKey: ['claims', 'details', claimId],
    queryFn: async () => {
      const res = await apiFetch(`/api/claims/${claimId}`);
      return res.data;
    },
    enabled: !!claimId
  });
};

export const useSaveDraftClaim = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimPayload: any) => {
      const res = await apiFetch('/api/claims/draft', {
        method: 'POST',
        body: JSON.stringify(claimPayload)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    }
  });
};

export const useSubmitFinalClaim = (claimId: string) => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimPayload: any) => {
      const res = await apiFetch(`/api/claims/${claimId}/submit`, {
        method: 'POST',
        body: JSON.stringify(claimPayload)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    }
  });
};

export const useCreateClaim = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimPayload: any) => {
      const res = await apiFetch('/api/claims', {
        method: 'POST',
        body: JSON.stringify(claimPayload)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    }
  });
};

export const useApproveClaim = (claimId: string) => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approvalPayload: any) => {
      const res = await apiFetch(`/api/claims/${claimId}/approve`, {
        method: 'POST',
        body: JSON.stringify(approvalPayload)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'details', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'queue'] });
    }
  });
};

export const useReturnClaim = (claimId: string) => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comments: string) => {
      const res = await apiFetch(`/api/claims/${claimId}/return`, {
        method: 'POST',
        body: JSON.stringify({ comments })
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'details', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'queue'] });
    }
  });
};

export const useRejectClaim = (claimId: string) => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comments: string) => {
      const res = await apiFetch(`/api/claims/${claimId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comments })
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'details', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claims', 'queue'] });
    }
  });
};

