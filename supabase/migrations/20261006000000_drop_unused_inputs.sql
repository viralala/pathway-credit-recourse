-- The retrained model (ml/, Kaggle Give Me Some Credit v2) does not use age, dependents or real-estate
-- loans, so new assessments no longer record them. Older rows keep their values.
alter table public.assessments alter column age drop not null;
alter table public.assessments alter column dependents drop not null;
alter table public.assessments alter column real_estate_loans drop not null;
