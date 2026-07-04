import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IJobRunState {
  value: string;
}

export const JobRunStateSchema: SchemaType = {
  value: { type: String, required: true },
};

export interface IJobRunStateModel extends IJobRunState, ISkewerModel {}

const JobRunStateDBModel = () => new SkewerModel<IJobRunStateModel>('job_run_state', JobRunStateSchema);

export async function getJobState(key: string): Promise<string | null> {
  const model = await JobRunStateDBModel().initialize();
  return model.findById(key)?.value ?? null;
}

export async function setJobState(key: string, value: string): Promise<void> {
  const model = await JobRunStateDBModel().initialize();
  await model.insertOrUpdate({ value }, key);
}
