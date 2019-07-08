import { ReducersMapObject, AnyAction } from 'redux'

export interface State {
  [key: string]: any
}

export interface Effects {
  [key: string]: Effect
}
export interface Effect {
  (dispatch: any, getState: any): any
}

export interface BaseModel {
  state: State
  reducers: ReducersMapObject<any, AnyAction>
  effects: Effects
}
export interface Model extends BaseModel {
  namespace: string
}
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
