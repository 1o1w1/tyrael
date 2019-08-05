import { BaseModel } from './tyrael'

export interface ModelExtend extends BaseModel {
  namespace?: string
}
export default function modelExtend(...modelArray: Array<ModelExtend>): ModelExtend {
  const model = modelArray.reduce((commonModel, model) => {
    return {
      namespace: model.namespace || commonModel.namespace,
      state: {
        ...commonModel.state,
        ...model.state
      },
      effects: {
        ...commonModel.effects,
        ...model.effects
      },
      reducers: {
        ...commonModel.reducers,
        ...model.reducers
      }
    }
  })

  return model
}
