import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1YogurtRevealScenario} from "./C1YogurtRevealScenario"
import {C2BothBadgesScenario} from "./C2BothBadgesScenario"
import {C3PinScenario} from "./C3PinScenario"
import {C4LookAwayClearsScenario} from "./C4LookAwayClearsScenario"
import {C5NoGradeScenario} from "./C5NoGradeScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-yogurt-reveal", typename: C1YogurtRevealScenario.getTypeName()},
    {id: "c2-both-badges", typename: C2BothBadgesScenario.getTypeName()},
    {id: "c3-pin-yogurt", typename: C3PinScenario.getTypeName()},
    {id: "c4-look-away-clears", typename: C4LookAwayClearsScenario.getTypeName()},
    {id: "c5-no-grade-mystery", typename: C5NoGradeScenario.getTypeName()},
  ]
}
