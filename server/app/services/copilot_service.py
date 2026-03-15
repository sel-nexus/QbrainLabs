"""
Copilot Service for US16: AI Copilot Assistant for Workshop Facilitation

Provides real-time AI-powered suggestions, engagement monitoring, anomaly detection,
discussion prompts, and summary generation for workshop facilitators.
"""
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import (
    Workshop, Participant, Vote, UseCase, 
    CopilotSuggestion, ParticipantEngagement, WorkshopSummary, 
    CopilotSettings, CopilotMode, WorkshopPhase,
    SuggestionType, SuggestionPriority, AnomalyType, AnomalySeverity
)
from app.schemas.copilot import (
    Suggestion,
    EngagementResponse,
    GenerateSummaryResponse,
    SuggestionsRequest
)
from app.core.config import settings
from app.utils.llm_tracking import track_llm_usage, get_usage_from_response
import statistics

class CopilotService:
    """
    AI Copilot service for workshop facilitation assistance.
    Provides contextual suggestions, engagement monitoring, and summary generation.
    """
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.azure_key = settings.AZURE_OPENAI_API_KEY
        self.azure_endpoint = settings.AZURE_OPENAI_ENDPOINT
        has_llm = self.api_key or (self.azure_key and self.azure_endpoint)
        self.mock_mode = settings.AI_MOCK_MODE or not has_llm
        self.llm = None

        if not self.mock_mode:
            self._initialize_ai_components()
        else:
            print("CopilotService running in MOCK MODE (No API Key found)")

    def _initialize_ai_components(self):
        """Initialize LangChain/OpenAI components (Azure OpenAI or standard OpenAI)."""
        try:
            from langchain_openai import ChatOpenAI, AzureChatOpenAI
            if self.azure_key and self.azure_endpoint:
                self.llm = AzureChatOpenAI(
                    azure_endpoint=self.azure_endpoint,
                    azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
                    api_key=self.azure_key,
                    api_version=settings.AZURE_OPENAI_API_VERSION,
                    temperature=settings.OPENAI_TEMPERATURE,
                    model=settings.AZURE_OPENAI_MODEL_NAME or settings.AZURE_OPENAI_DEPLOYMENT,
                )
            else:
                self.llm = ChatOpenAI(
                    temperature=settings.OPENAI_TEMPERATURE,
                    model=settings.OPENAI_MODEL,
                    api_key=self.api_key
                )
        except ImportError:
            print("LangChain dependencies missing. Reverting to Mock Mode.")
            self.mock_mode = True
        except Exception as e:
            print(f"Failed to init AI components: {e}")
            self.mock_mode = True

    # =========================================================================
    # Suggestion Generation
    # =========================================================================
    
    async def generate_suggestions(
        self,
        workshop: Workshop,
        participants: List[Participant],
        use_cases: List[UseCase],
        votes: List[Vote],
        settings: Optional[CopilotSettings] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate contextual suggestions based on workshop state.
        Phase-specific suggestions for intake, scoring, and analysis phases.
        """
        suggestions = []
        phase = workshop.current_phase
        
        # Check if in silent mode
        if settings and settings.mode == CopilotMode.SILENT.value:
            return []
        
        # 1. Rule-based Suggestions (Fast, deterministic)
        if phase == WorkshopPhase.INTAKE.value or phase == "INTAKE":
            suggestions.extend(await self._generate_intake_suggestions(
                workshop, participants, use_cases, settings
            ))
        elif phase == WorkshopPhase.SCORING.value or phase == "SCORING":
            suggestions.extend(await self._generate_scoring_suggestions(
                workshop, participants, use_cases, votes, settings
            ))
        elif phase == WorkshopPhase.ANALYSIS.value or phase == "ANALYSIS":
            suggestions.extend(await self._generate_analysis_suggestions(
                workshop, use_cases, votes, settings
            ))
        
        # 2. AI-generated Nuanced Suggestions (Slower, deeper)
        if not self.mock_mode:
            try:
                ai_suggestions = await self._generate_ai_suggestions(
                    workshop, participants, use_cases, votes, phase
                )
                suggestions.extend(ai_suggestions)
            except Exception as e:
                print(f"AI Suggestion generation failed: {e}")

        # Always check engagement across all phases
        if not settings or settings.engagement_alerts_enabled:
            engagement_suggestions = await self._check_engagement_status(
                workshop, participants, settings
            )
            suggestions.extend(engagement_suggestions)
        
        return suggestions

    async def _generate_ai_suggestions(
        self,
        workshop: Workshop,
        participants: List[Participant],
        use_cases: List[UseCase],
        votes: List[Vote],
        phase: str
    ) -> List[Dict[str, Any]]:
        """Generate high-level facilitation advice using LLM."""
        from langchain_core.messages import HumanMessage
        
        # Prepare context context
        active_participant_count = len([p for p in participants if p.role == "PARTICIPANT"])
        use_case_count = len(use_cases)
        vote_count = len(votes)
        
        context_str = f"""
        Workshop: {workshop.title}
        Phase: {phase}
        Participants: {active_participant_count}
        Use Cases: {use_case_count}
        Votes: {vote_count}
        """
        
        if phase == "INTAKE":
            context_str += f"\nRecent Use Cases: {[uc.title for uc in use_cases[-3:]]}"
        elif phase == "SCORING":
            # Add voting dynamics?
            pass
            
        prompt = f"""
        Act as an Expert Workshop Facilitator. Analyze the current workshop state and provide ONE high-value suggestion/intervention if needed.
        State:
        {context_str}
        
        If everything looks normal, return null.
        If there's an opportunity to improve energy, clarity, or depth, return a JSON object:
        {{
            "type": "FACILITATION",
            "message": "Brief, punchy advice for the facilitator",
            "priority": "LOW|MEDIUM|HIGH",
            "actions": [{{"label": "Button Label", "action": "action_id"}}]
        }}
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content
        if "null" in content.lower() and len(content) < 10:
            return []
            
        try:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            suggestion = json.loads(content)
            if suggestion:
                return [suggestion]
        except:
            pass
            
        return []
    
    async def _generate_intake_suggestions(
        self,
        workshop: Workshop,
        participants: List[Participant],
        use_cases: List[UseCase],
        settings: Optional[CopilotSettings]
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for the Intake phase."""
        suggestions = []
        total_participants = len([p for p in participants if p.role == "PARTICIPANT"])
        submitted_count = len(set(uc.participant_id for uc in use_cases if uc.participant_id))
        
        # Check submission rate
        if total_participants > 0:
            submission_rate = submitted_count / total_participants
            
            if submission_rate < 0.5 and total_participants >= 5:
                not_submitted = total_participants - submitted_count
                suggestions.append({
                    "type": SuggestionType.ENGAGEMENT.value,
                    "message": f"{not_submitted} participants haven't submitted yet. Consider sending a reminder.",
                    "priority": SuggestionPriority.MEDIUM.value,
                    "actions": [
                        {"label": "Send Reminder", "action": "send_reminder"},
                        {"label": "Extend Time", "action": "extend_intake"},
                        {"label": "Dismiss", "action": "dismiss"}
                    ],
                    "context": {
                        "total_participants": total_participants,
                        "submitted_count": submitted_count,
                        "submission_rate": round(submission_rate * 100, 1)
                    }
                })
        
        # Low use case volume suggestion
        if len(use_cases) < 3 and total_participants >= 5:
            suggestions.append({
                "type": SuggestionType.FACILITATION.value,
                "message": "Use case volume is low. Try: 'Think about processes that frustrate you daily.'",
                "priority": SuggestionPriority.MEDIUM.value,
                "actions": [
                    {"label": "Show Prompt", "action": "show_prompt"},
                    {"label": "Dismiss", "action": "dismiss"}
                ],
                "context": {"use_case_count": len(use_cases)}
            })
        
        # Detect common themes
        if len(use_cases) >= 3:
            themes = await self._detect_themes(use_cases)
            if themes:
                suggestions.append({
                    "type": SuggestionType.CONTENT.value,
                    "message": f"Several submissions mention '{themes[0]}' - this could be a hot topic.",
                    "priority": SuggestionPriority.LOW.value,
                    "actions": [
                        {"label": "View Related", "action": "view_themed"},
                        {"label": "Dismiss", "action": "dismiss"}
                    ],
                    "context": {"themes": themes}
                })
        
        # Check for duplicates
        duplicates = await self._check_duplicates(use_cases)
        if duplicates:
            for dup in duplicates[:2]:  # Limit to top 2
                suggestions.append({
                    "type": SuggestionType.CONTENT.value,
                    "message": f"Duplicate detected: '{dup['title1']}' and '{dup['title2']}' are {dup['similarity']}% similar.",
                    "priority": SuggestionPriority.MEDIUM.value,
                    "actions": [
                        {"label": "Merge", "action": "merge_duplicates"},
                        {"label": "Keep Both", "action": "keep_both"},
                        {"label": "Dismiss", "action": "dismiss"}
                    ],
                    "context": dup
                })
        
        return suggestions
    
    async def _generate_scoring_suggestions(
        self,
        workshop: Workshop,
        participants: List[Participant],
        use_cases: List[UseCase],
        votes: List[Vote],
        settings: Optional[CopilotSettings]
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for the Scoring phase."""
        suggestions = []
        
        # Check voting velocity
        if votes:
            velocity = await self._calculate_voting_velocity(votes)
            if velocity < 0.5:  # Less than 0.5 votes per minute
                suggestions.append({
                    "type": SuggestionType.FACILITATION.value,
                    "message": "Voting velocity is slowing. Consider taking a 5-minute break.",
                    "priority": SuggestionPriority.MEDIUM.value,
                    "actions": [
                        {"label": "Take Break", "action": "take_break"},
                        {"label": "Send Nudge", "action": "send_nudge"},
                        {"label": "Dismiss", "action": "dismiss"}
                    ],
                    "context": {"velocity": velocity}
                })
        
        # Check for high variance on current use case
        if workshop.active_use_case_id:
            variance_data = await self._analyze_use_case_variance(
                str(workshop.active_use_case_id), votes
            )
            threshold = float(settings.variance_alert_threshold) if settings else 2.5
            
            if variance_data.get("std_dev", 0) > threshold:
                active_uc = next((uc for uc in use_cases if str(uc.id) == str(workshop.active_use_case_id)), None)
                title = active_uc.title if active_uc else "Current use case"
                
                suggestions.append({
                    "type": SuggestionType.VOTING.value,
                    "message": f"High disagreement on '{title[:50]}' (σ={variance_data['std_dev']:.1f}). May need discussion.",
                    "priority": SuggestionPriority.HIGH.value,
                    "actions": [
                        {"label": "Pause for Discussion", "action": "pause_discussion"},
                        {"label": "View Details", "action": "view_variance"},
                        {"label": "Continue", "action": "dismiss"}
                    ],
                    "context": variance_data
                })
        
        # Check for team bias patterns
        team_bias = await self._detect_team_bias(participants, votes)
        if team_bias:
            suggestions.append({
                "type": SuggestionType.ANOMALY.value,
                "message": f"Team '{team_bias['team']}' is voting consistently {team_bias['direction']}. Consider calibration.",
                "priority": SuggestionPriority.MEDIUM.value,
                "actions": [
                    {"label": "Calibration Exercise", "action": "calibration"},
                    {"label": "Dismiss", "action": "dismiss"}
                ],
                "context": team_bias
            })
        
        return suggestions
    
    async def _generate_analysis_suggestions(
        self,
        workshop: Workshop,
        use_cases: List[UseCase],
        votes: List[Vote],
        settings: Optional[CopilotSettings]
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for the Analysis phase."""
        suggestions = []
        
        # Analyze quadrant distribution
        quadrant_analysis = await self._analyze_quadrants(use_cases, votes)
        
        if quadrant_analysis.get("quick_wins_count", 0) > 5:
            suggestions.append({
                "type": SuggestionType.FACILITATION.value,
                "message": f"Quick Wins quadrant has {quadrant_analysis['quick_wins_count']} items. Prioritize top 3 for action planning.",
                "priority": SuggestionPriority.MEDIUM.value,
                "actions": [
                    {"label": "View Top 3", "action": "view_top_quick_wins"},
                    {"label": "Dismiss", "action": "dismiss"}
                ],
                "context": quadrant_analysis
            })
        
        if quadrant_analysis.get("strategic_bets_count", 0) == 0:
            suggestions.append({
                "type": SuggestionType.DISCUSSION.value,
                "message": "No items in Strategic Bets. May indicate risk-averse group.",
                "priority": SuggestionPriority.LOW.value,
                "actions": [
                    {"label": "Discuss Risk Appetite", "action": "discuss_risk"},
                    {"label": "Dismiss", "action": "dismiss"}
                ],
                "context": quadrant_analysis
            })
        
        # Suggest grouping similar use cases
        similar_groups = await self._find_similar_groups(use_cases)
        if similar_groups:
            suggestions.append({
                "type": SuggestionType.CONTENT.value,
                "message": "Suggest grouping similar use cases before final prioritization.",
                "priority": SuggestionPriority.MEDIUM.value,
                "actions": [
                    {"label": "View Groups", "action": "view_groups"},
                    {"label": "Auto-Group", "action": "auto_group"},
                    {"label": "Dismiss", "action": "dismiss"}
                ],
                "context": {"groups": similar_groups}
            })
        
        return suggestions

    # =========================================================================
    # Engagement Monitoring
    # =========================================================================
    
    async def analyze_engagement(
        self,
        workshop_id: str,
        participants: List[Participant],
        votes: List[Vote],
        use_cases: List[UseCase]
    ) -> Dict[str, Any]:
        """
        Analyze participant engagement and return metrics.
        """
        participant_metrics = []
        at_risk_count = 0
        total_score = 0
        
        for participant in participants:
            if participant.role != "PARTICIPANT":
                continue
            
            # Calculate metrics for this participant
            p_votes = [v for v in votes if str(v.participant_id) == str(participant.id)]
            p_submissions = [uc for uc in use_cases if str(uc.participant_id) == str(participant.id)]
            
            # Calculate engagement score (0-100)
            score = self._calculate_engagement_score(p_votes, p_submissions, len(use_cases))
            total_score += score
            
            # Determine last activity
            last_activity = None
            alerts = []
            
            if p_votes:
                # In real implementation, would track vote timestamps
                last_activity = datetime.utcnow()
            
            # Check for alerts
            if score < 30:
                alerts.append({
                    "type": "low_engagement",
                    "message": "Low participation detected"
                })
                at_risk_count += 1
            
            if len(p_votes) == 0 and len(use_cases) > 3:
                alerts.append({
                    "type": "no_votes",
                    "message": "No votes submitted yet"
                })
            
            participant_metrics.append({
                "id": str(participant.id),
                "name": participant.display_name,
                "engagement_score": score,
                "vote_count": len(p_votes),
                "submission_count": len(p_submissions),
                "last_activity": last_activity.isoformat() if last_activity else None,
                "alerts": alerts
            })
        
        avg_engagement = total_score / len(participant_metrics) if participant_metrics else 0
        
        return {
            "participants": participant_metrics,
            "group_metrics": {
                "avg_engagement": round(avg_engagement, 1),
                "at_risk_count": at_risk_count,
                "total_participants": len(participant_metrics)
            }
        }
    
    def _calculate_engagement_score(
        self,
        votes: List[Vote],
        submissions: List[UseCase],
        total_use_cases: int
    ) -> float:
        """Calculate engagement score for a participant (0-100)."""
        score = 0
        
        # Submission contribution (30 points max)
        if submissions:
            score += min(30, len(submissions) * 15)
        
        # Voting participation (50 points max)
        if total_use_cases > 0:
            vote_rate = len(votes) / total_use_cases
            score += min(50, vote_rate * 50)
        
        # Vote quality - not all same scores (20 points max)
        if votes:
            unique_scores = set()
            for vote in votes:
                if vote.scores:
                    for criterion, value in vote.scores.items():
                        unique_scores.add(value)
            
            if len(unique_scores) > 3:
                score += 20
            elif len(unique_scores) > 1:
                score += 10
        
        return min(100, score)
    
    async def _check_engagement_status(
        self,
        workshop: Workshop,
        participants: List[Participant],
        settings: Optional[CopilotSettings]
    ) -> List[Dict[str, Any]]:
        """Check for engagement alerts."""
        suggestions = []
        inactivity_threshold = int(settings.inactivity_threshold_minutes) if settings else 8
        
        # In real implementation, would check actual last activity timestamps
        # For now, return mock alerts
        inactive_participants = []
        
        for p in participants:
            if p.role == "PARTICIPANT":
                # Check engagement records if available
                if hasattr(p, 'engagement_records') and p.engagement_records:
                    latest = p.engagement_records[-1]
                    if latest.last_activity:
                        minutes_inactive = (datetime.utcnow() - latest.last_activity).total_seconds() / 60
                        if minutes_inactive > inactivity_threshold:
                            inactive_participants.append(p)
        
        if inactive_participants:
            if len(inactive_participants) == 1:
                p = inactive_participants[0]
                suggestions.append({
                    "type": SuggestionType.ENGAGEMENT.value,
                    "message": f"Participant '{p.display_name}' hasn't interacted in {inactivity_threshold}+ minutes.",
                    "priority": SuggestionPriority.MEDIUM.value,
                    "actions": [
                        {"label": "Check In", "action": "check_in"},
                        {"label": "Group Break", "action": "take_break"},
                        {"label": "Dismiss", "action": "dismiss"}
                    ],
                    "context": {"participant_id": str(p.id), "participant_name": p.display_name}
                })
            else:
                suggestions.append({
                    "type": SuggestionType.ENGAGEMENT.value,
                    "message": f"Low engagement detected: {len(inactive_participants)} participants below activity threshold.",
                    "priority": SuggestionPriority.HIGH.value,
                    "actions": [
                        {"label": "Group Break", "action": "take_break"},
                        {"label": "View Details", "action": "view_engagement"},
                        {"label": "Dismiss", "action": "dismiss"}
                    ],
                    "context": {"inactive_count": len(inactive_participants)}
                })
        
        return suggestions

    # =========================================================================
    # Anomaly Detection
    # =========================================================================
    
    async def detect_anomalies(
        self,
        workshop_id: str,
        data_type: str,
        participants: List[Participant],
        votes: List[Vote],
        use_cases: List[UseCase]
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalies in workshop data.
        data_type: "votes", "content", or "behavior"
        """
        anomalies = []
        
        if data_type in ["votes", "all"]:
            anomalies.extend(await self._detect_voting_anomalies(participants, votes))
        
        if data_type in ["content", "all"]:
            anomalies.extend(await self._detect_content_anomalies(use_cases))
        
        if data_type in ["behavior", "all"]:
            anomalies.extend(await self._detect_behavior_anomalies(participants, votes, use_cases))
        
        return anomalies
    
    async def _detect_voting_anomalies(
        self,
        participants: List[Participant],
        votes: List[Vote]
    ) -> List[Dict[str, Any]]:
        """
        Detect voting pattern anomalies using AI-powered analysis.
        Includes groupthink detection and bias pattern identification.
        """
        anomalies = []
        
        # Individual participant anomalies
        for participant in participants:
            if participant.role != "PARTICIPANT":
                continue
            
            p_votes = [v for v in votes if str(v.participant_id) == str(participant.id)]
            
            if len(p_votes) < 3:
                continue
            
            # Check for uniform voting (all same scores)
            all_scores = []
            for vote in p_votes:
                if vote.scores:
                    all_scores.extend(vote.scores.values())
            
            if all_scores:
                unique_scores = set(all_scores)
                
                # All same scores - potential disengagement
                if len(unique_scores) == 1:
                    anomalies.append({
                        "type": AnomalyType.VOTING_UNIFORM.value,
                        "severity": AnomalySeverity.WARNING.value,
                        "details": {
                            "participant_id": str(participant.id),
                            "participant_name": participant.display_name,
                            "uniform_score": list(unique_scores)[0],
                            "vote_count": len(p_votes)
                        },
                        "recommendation": f"'{participant.display_name}' is voting the same score for all items. May indicate disengagement."
                    })
                
                # All extreme scores (all 1-2 or all 9-10)
                if all(s <= 2 for s in all_scores) or all(s >= 9 for s in all_scores):
                    direction = "low" if all(s <= 2 for s in all_scores) else "high"
                    anomalies.append({
                        "type": AnomalyType.VOTING_EXTREME.value,
                        "severity": AnomalySeverity.INFO.value,
                        "details": {
                            "participant_id": str(participant.id),
                            "participant_name": participant.display_name,
                            "direction": direction
                        },
                        "recommendation": f"'{participant.display_name}' is consistently voting {direction}. Consider discussing scoring criteria."
                    })
        
        # AI-powered group-level anomaly detection
        if not self.mock_mode and len(votes) >= 10:
            group_anomalies = await self._detect_groupthink_and_bias(participants, votes)
            anomalies.extend(group_anomalies)
        else:
            # Fallback: Basic statistical groupthink detection
            if votes:
                all_vote_values = []
                for vote in votes:
                    if vote.scores:
                        all_vote_values.extend(vote.scores.values())
                
                if len(all_vote_values) >= 10:
                    std_dev = statistics.stdev(all_vote_values)
                    
                    # Very low variance (groupthink)
                    if std_dev < 1.0:
                        anomalies.append({
                            "type": AnomalyType.GROUP_GROUPTHINK.value,
                            "severity": AnomalySeverity.WARNING.value,
                            "details": {
                                "std_dev": round(std_dev, 2),
                                "vote_count": len(votes)
                            },
                            "recommendation": "Very low variance in voting (σ < 1.0). This may indicate groupthink. Consider anonymous voting or structured debate."
                        })
        
        return anomalies
    
    async def _detect_groupthink_and_bias(
        self,
        participants: List[Participant],
        votes: List[Vote]
    ) -> List[Dict[str, Any]]:
        """
        Use AI to detect groupthink patterns and voting biases.
        Analyzes voting patterns for unusual uniformity and systematic biases.
        """
        try:
            from langchain_core.messages import HumanMessage
            
            # Prepare voting data for analysis
            voting_patterns = []
            for participant in participants:
                if participant.role != "PARTICIPANT":
                    continue
                
                p_votes = [v for v in votes if str(v.participant_id) == str(participant.id)]
                if not p_votes:
                    continue
                
                scores = []
                for vote in p_votes:
                    if vote.scores:
                        scores.extend(vote.scores.values())
                
                if scores:
                    voting_patterns.append({
                        "participant_name": participant.display_name,
                        "vote_count": len(p_votes),
                        "avg_score": round(sum(scores) / len(scores), 2),
                        "min_score": min(scores),
                        "max_score": max(scores),
                        "score_range": max(scores) - min(scores)
                    })
            
            if len(voting_patterns) < 3:
                return []
            
            # Calculate overall statistics
            all_scores = []
            for vote in votes:
                if vote.scores:
                    all_scores.extend(vote.scores.values())
            
            overall_std = statistics.stdev(all_scores) if len(all_scores) > 1 else 0
            overall_avg = sum(all_scores) / len(all_scores) if all_scores else 0
            
            prompt = f"""Analyze these voting patterns for anomalies in a workshop prioritization session.

Voting Patterns by Participant:
{json.dumps(voting_patterns, indent=2)}

Overall Statistics:
- Total Votes: {len(votes)}
- Overall Average Score: {overall_avg:.2f}
- Standard Deviation: {overall_std:.2f}

Identify potential issues:
1. **Groupthink**: Unusually low variance suggesting participants are not thinking independently
2. **Systematic Bias**: Participants consistently voting high or low regardless of content
3. **Polarization**: Extreme disagreement patterns
4. **Recency Bias**: If detectable from patterns

For each anomaly found, return:
- Type (groupthink, systematic_bias, polarization, etc.)
- Severity (low, medium, high)
- Explanation of the pattern
- Specific evidence from the data
- Actionable recommendation

Return JSON array:
[
  {{
    "type": "groupthink",
    "severity": "medium",
    "explanation": "All participants voting very similarly with minimal variance",
    "evidence": "Standard deviation of 0.8 across all votes, all averages within 1 point",
    "recommendation": "Encourage devil's advocate role or anonymous voting to surface disagreements"
  }}
]

If no significant anomalies, return empty array []."""

            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            content = response.content
            
            # Clean JSON from markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Handle empty response
            if content.strip() == "[]" or "no" in content.lower()[:50]:
                return []
            
            detected_anomalies = json.loads(content)
            
            # Convert to standard anomaly format
            anomalies = []
            severity_map = {"low": AnomalySeverity.INFO.value, "medium": AnomalySeverity.WARNING.value, "high": AnomalySeverity.HIGH.value}
            
            for anomaly in detected_anomalies:
                anomalies.append({
                    "type": anomaly.get("type", "voting_pattern"),
                    "severity": severity_map.get(anomaly.get("severity", "medium"), AnomalySeverity.WARNING.value),
                    "details": {
                        "evidence": anomaly.get("evidence", ""),
                        "overall_std": overall_std,
                        "participant_count": len(voting_patterns)
                    },
                    "explanation": anomaly.get("explanation", ""),
                    "recommendation": anomaly.get("recommendation", "")
                })
            
            return anomalies
            
        except Exception as e:
            print(f"Groupthink and bias detection failed: {e}")
            return []

    
    async def _detect_content_anomalies(
        self,
        use_cases: List[UseCase]
    ) -> List[Dict[str, Any]]:
        """
        Detect content-related anomalies using AI-powered semantic analysis.
        Includes semantic duplicate detection and quality assessment.
        """
        anomalies = []
        
        # AI-powered semantic duplicate detection
        if not self.mock_mode and len(use_cases) >= 2:
            semantic_duplicates = await self._detect_semantic_duplicates(use_cases)
            anomalies.extend(semantic_duplicates)
        else:
            # Fallback to keyword-based duplicate detection
            duplicates = await self._check_duplicates(use_cases)
            for dup in duplicates:
                anomalies.append({
                    "type": AnomalyType.CONTENT_DUPLICATE.value,
                    "severity": AnomalySeverity.INFO.value,
                    "details": dup,
                    "recommendation": f"Consider merging '{dup['title1']}' with '{dup['title2']}' ({dup['similarity']}% similar)."
                })
        
        # Check for very short/low-quality submissions
        for uc in use_cases:
            if len(uc.description) < 20:
                anomalies.append({
                    "type": AnomalyType.CONTENT_OFFTOPIC.value,
                    "severity": AnomalySeverity.INFO.value,
                    "details": {
                        "use_case_id": str(uc.id),
                        "title": uc.title,
                        "description_length": len(uc.description)
                    },
                    "recommendation": f"Use case '{uc.title}' has a very brief description. Consider asking for more details."
                })
        
        return anomalies
    
    async def _detect_semantic_duplicates(
        self,
        use_cases: List[UseCase]
    ) -> List[Dict[str, Any]]:
        """
        Use AI to detect semantically similar use cases that may be duplicates.
        Returns anomalies with LLM-generated explanations.
        """
        if len(use_cases) < 2:
            return []
        
        try:
            from langchain_core.messages import HumanMessage
            
            # Prepare use case data for analysis
            use_case_data = []
            for uc in use_cases:
                use_case_data.append({
                    "id": str(uc.id),
                    "title": uc.title,
                    "description": uc.description[:300] if uc.description else "",
                    "solution": uc.proposed_solution[:200] if hasattr(uc, 'proposed_solution') and uc.proposed_solution else ""
                })
            
            prompt = f"""Analyze these AI use cases for semantic similarity and potential duplicates.

Use Cases:
{json.dumps(use_case_data, indent=2)}

Identify pairs or groups of use cases that:
1. Solve the same problem with similar approaches
2. Target the same business outcome
3. Use similar technology stacks
4. Would likely be redundant if both were implemented

For each duplicate/similar pair found, return:
- The IDs of the similar use cases
- Similarity score (0.0-1.0)
- Explanation of why they're similar
- Recommendation (merge, differentiate, or keep both)

Return JSON array:
[
  {{
    "use_case_ids": ["id1", "id2"],
    "similarity_score": 0.85,
    "explanation": "Both propose chatbot solutions for customer service using similar LLM technology",
    "recommendation": "merge",
    "rationale": "These use cases overlap significantly. Consider merging into one with broader scope."
  }}
]

If no significant duplicates found, return empty array []."""

            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            content = response.content
            
            # Clean JSON from markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Handle empty array response
            if content.strip() == "[]" or "no" in content.lower()[:50]:
                return []
            
            duplicates = json.loads(content)
            
            # Convert to anomaly format
            anomalies = []
            for dup in duplicates:
                if dup.get("similarity_score", 0) > 0.7:  # High similarity threshold
                    severity = AnomalySeverity.HIGH.value if dup["similarity_score"] > 0.9 else AnomalySeverity.MEDIUM.value
                    
                    anomalies.append({
                        "type": "semantic_duplicate",
                        "severity": severity,
                        "details": {
                            "use_case_ids": dup["use_case_ids"],
                            "similarity_score": dup["similarity_score"],
                            "titles": [uc["title"] for uc in use_case_data if uc["id"] in dup["use_case_ids"]]
                        },
                        "explanation": dup["explanation"],
                        "recommendation": dup["rationale"],
                        "suggested_action": dup["recommendation"]
                    })
            
            return anomalies
            
        except Exception as e:
            print(f"Semantic duplicate detection failed: {e}")
            return []

    
    async def _detect_behavior_anomalies(
        self,
        participants: List[Participant],
        votes: List[Vote],
        use_cases: List[UseCase]
    ) -> List[Dict[str, Any]]:
        """Detect behavioral anomalies."""
        anomalies = []
        
        # Check for inactive participants
        for participant in participants:
            if participant.role != "PARTICIPANT":
                continue
            
            p_votes = [v for v in votes if str(v.participant_id) == str(participant.id)]
            p_submissions = [uc for uc in use_cases if str(uc.participant_id) == str(participant.id)]
            
            if len(p_votes) == 0 and len(p_submissions) == 0 and len(use_cases) > 5:
                anomalies.append({
                    "type": AnomalyType.BEHAVIOR_INACTIVE.value,
                    "severity": AnomalySeverity.WARNING.value,
                    "details": {
                        "participant_id": str(participant.id),
                        "participant_name": participant.display_name
                    },
                    "recommendation": f"'{participant.display_name}' has no activity. Consider checking in privately."
                })
        
        return anomalies

    # =========================================================================
    # Discussion Prompts
    # =========================================================================
    
    async def generate_discussion_prompts(
        self,
        use_case: UseCase,
        variance_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered discussion prompts for a use case."""
        
        if self.mock_mode:
            return self._get_mock_discussion_prompts(use_case, variance_data)
        
        # Use AI to generate contextual prompts
        try:
            from langchain_core.messages import HumanMessage
            
            variance_context = ""
            if variance_data and variance_data.get('std_dev', 0) > 2:
                variance_context = f"NOTE: High voting variance (std_dev={variance_data.get('std_dev'):.1f}) detected. {variance_data.get('disagreement_context', '')}"
            
            prompt = f"""
            Generate 4 thought-provoking discussion questions for this AI use case to help the team refine or evaluate it.
            
            Title: {use_case.title}
            Description: {use_case.description}
            Proposed Solution: {use_case.proposed_solution or 'Not specified'}
            
            {variance_context}
            
            Return a JSON array of objects. Each object must have:
            - "category": one of ["Risk", "Value", "Feasibility", "Alignment"]
            - "question": The discussion question
            - "follow_up": A follow-up probe (e.g., "What if...")
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            content = response.content
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            result = json.loads(content)
            return result
        except Exception as e:
            print(f"AI prompt generation failed: {e}")
            return self._get_mock_discussion_prompts(use_case, variance_data)

    async def generate_summary(
        self,
        workshop: Workshop,
        use_cases: List[UseCase],
        votes: List[Vote],
        participants: List[Participant],
        format: str = "executive",
        sections: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate workshop summary in the specified format."""
        
        sections = sections or ["findings", "recommendations", "next_steps"]
        
        # Calculate aggregated data
        scored_use_cases = await self._calculate_scores(use_cases, votes)
        
        engagement_data = await self.analyze_engagement(
            str(workshop.id), participants, votes, use_cases
        )
        
        if self.mock_mode:
            return self._generate_mock_summary(
                workshop, scored_use_cases, engagement_data, format, sections
            )
        
        # Use AI to generate summary
        try:
            from langchain_core.messages import HumanMessage
            
            top_cases = scored_use_cases[:5] if scored_use_cases else []
            top_cases_summary = [{"title": uc.get("title"), "score": uc.get("avg_score")} for uc in top_cases]
            
            prompt = f"""
            Act as a Strategic Consultant. Write a {format} summary for an AI Prioritization Workshop.
            
            Workshop Title: {workshop.title}
            Date: {datetime.utcnow().strftime('%Y-%m-%d')}
            Participants: {len(participants)}
            Total Ideas: {len(use_cases)}
             Engagement Level: {engagement_data['group_metrics']['avg_engagement']}%
            
            Top Prioritized Use Cases:
            {json.dumps(top_cases_summary, indent=2)}
            
            Please generate the following sections in JSON format:
            {json.dumps(sections)}
            
            Return JSON object with keys matching the requested sections plus 'executive_summary'.
            Ensure the tone is professional and actionable.
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            content = response.content
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            result = json.loads(content)
            result["format"] = format
            result["generated_at"] = datetime.utcnow().isoformat()
            result["is_mock"] = False
            return result
        except Exception as e:
            print(f"AI summary generation failed: {e}")
            return self._generate_mock_summary(
                workshop, scored_use_cases, engagement_data, format, sections
            )
    
    def _generate_mock_summary(
        self,
        workshop: Workshop,
        scored_use_cases: List[Dict[str, Any]],
        engagement_data: Dict[str, Any],
        format: str,
        sections: List[str]
    ) -> Dict[str, Any]:
        """Generate mock summary."""
        top_cases = scored_use_cases[:3] if scored_use_cases else []
        
        summary = {
            "format": format,
            "generated_at": datetime.utcnow().isoformat(),
            "is_mock": True,
            "executive_summary": f"The {workshop.title} workshop identified {len(scored_use_cases)} AI use cases. "
                                f"The group showed {engagement_data['group_metrics']['avg_engagement']:.0f}% average engagement. "
                                f"Top priority items have been identified for immediate action.",
            "key_findings": [
                f"{len(scored_use_cases)} total use cases were submitted and scored",
                f"Participant engagement averaged {engagement_data['group_metrics']['avg_engagement']:.0f}%",
                f"{len(top_cases)} high-priority use cases emerged as Quick Wins"
            ],
            "top_recommendations": [
                {
                    "title": uc.get("title", "Use Case"),
                    "score": uc.get("avg_score", 0),
                    "rationale": "High value, high feasibility - recommended for immediate action"
                }
                for uc in top_cases
            ],
            "next_steps": [
                "Schedule deep-dive sessions for top 3 use cases",
                "Assign business owners and technical leads",
                "Develop detailed business cases and ROI projections",
                "Create implementation timeline and resource plan"
            ],
            "participant_stats": {
                "total": engagement_data["group_metrics"]["total_participants"],
                "avg_engagement": engagement_data["group_metrics"]["avg_engagement"],
                "at_risk": engagement_data["group_metrics"]["at_risk_count"]
            }
        }
        
        return summary

    def _get_mock_discussion_prompts(
        self,
        use_case: UseCase,
        variance_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate mock discussion prompts."""
        prompts = [
            {
                "category": "Risk",
                "question": f"What are the main technical risks in implementing '{use_case.title}'?",
                "follow_up": "How can we mitigate these risks early in the project?"
            },
            {
                "category": "Value",
                "question": "Who are the key stakeholders that will benefit from this solution?",
                "follow_up": "What metrics will we use to measure success?"
            },
            {
                "category": "Feasibility",
                "question": "Do we have the necessary data and infrastructure to support this use case?",
                "follow_up": "What gaps need to be addressed before implementation?"
            },
            {
                "category": "Alignment",
                "question": "How does this align with our strategic priorities for the quarter?",
                "follow_up": "Are there dependencies on other initiatives?"
            }
        ]
        
        if variance_data and variance_data.get('std_dev', 0) > 2:
            prompts.insert(0, {
                "category": "Consensus",
                "question": f"There's significant disagreement on this use case (variance: {variance_data.get('std_dev', 0):.1f}). What aspects are causing the divergence?",
                "follow_up": "Should we break this down into smaller, more specific use cases?"
            })
        
        return prompts


    # =========================================================================
    # Variance Analysis
    # =========================================================================
    
    async def analyze_variance(
        self,
        use_case_id: str,
        votes: List[Vote]
    ) -> Dict[str, Any]:
        """Analyze voting variance for a specific use case."""
        return await self._analyze_use_case_variance(use_case_id, votes)
    
    async def _analyze_use_case_variance(
        self,
        use_case_id: str,
        votes: List[Vote]
    ) -> Dict[str, Any]:
        """Calculate variance statistics for a use case."""
        uc_votes = [v for v in votes if str(v.use_case_id) == use_case_id]
        
        if not uc_votes:
            return {
                "use_case_id": use_case_id,
                "vote_count": 0,
                "std_dev": 0,
                "is_significant": False,
                "distribution": {}
            }
        
        all_scores = []
        by_criterion = {}
        
        for vote in uc_votes:
            if vote.scores:
                for criterion, value in vote.scores.items():
                    all_scores.append(value)
                    if criterion not in by_criterion:
                        by_criterion[criterion] = []
                    by_criterion[criterion].append(value)
        
        if not all_scores:
            return {
                "use_case_id": use_case_id,
                "vote_count": len(uc_votes),
                "std_dev": 0,
                "is_significant": False,
                "distribution": {}
            }
        
        std_dev = statistics.stdev(all_scores) if len(all_scores) > 1 else 0
        mean = statistics.mean(all_scores)
        
        # Calculate distribution buckets
        distribution = {"1-3": 0, "4-6": 0, "7-10": 0}
        for score in all_scores:
            if score <= 3:
                distribution["1-3"] += 1
            elif score <= 6:
                distribution["4-6"] += 1
            else:
                distribution["7-10"] += 1
        
        # Check for bimodal distribution (polarization)
        is_bimodal = distribution["1-3"] > 0 and distribution["7-10"] > 0 and distribution["4-6"] < max(distribution["1-3"], distribution["7-10"])
        
        return {
            "use_case_id": use_case_id,
            "vote_count": len(uc_votes),
            "mean": round(mean, 2),
            "std_dev": round(std_dev, 2),
            "is_significant": std_dev > 2.5,
            "is_bimodal": is_bimodal,
            "distribution": distribution,
            "by_criterion": {
                k: {
                    "mean": round(statistics.mean(v), 2),
                    "std_dev": round(statistics.stdev(v), 2) if len(v) > 1 else 0
                }
                for k, v in by_criterion.items()
            }
        }

    # =========================================================================
    # Helper Methods
    # =========================================================================
    
    async def _detect_themes(self, use_cases: List[UseCase]) -> List[str]:
        """Detect common themes in use case submissions."""
        # Simple keyword extraction
        keywords = {}
        common_words = {"the", "a", "an", "is", "are", "for", "to", "of", "and", "in", "with", "on", "at", "by"}
        
        for uc in use_cases:
            text = f"{uc.title} {uc.description}".lower()
            words = text.split()
            for word in words:
                word = word.strip(".,!?")
                if len(word) > 3 and word not in common_words:
                    keywords[word] = keywords.get(word, 0) + 1
        
        # Return top themes
        sorted_keywords = sorted(keywords.items(), key=lambda x: x[1], reverse=True)
        return [kw for kw, count in sorted_keywords[:3] if count >= 2]
    
    async def _check_duplicates(self, use_cases: List[UseCase]) -> List[Dict[str, Any]]:
        """Check for duplicate/similar use cases."""
        import difflib
        
        duplicates = []
        checked = set()
        
        for i, uc1 in enumerate(use_cases):
            for j, uc2 in enumerate(use_cases):
                if i >= j:
                    continue
                
                pair_key = f"{uc1.id}-{uc2.id}"
                if pair_key in checked:
                    continue
                checked.add(pair_key)
                
                # Compare title and description
                text1 = f"{uc1.title} {uc1.description}".lower()
                text2 = f"{uc2.title} {uc2.description}".lower()
                
                similarity = difflib.SequenceMatcher(None, text1, text2).ratio()
                
                if similarity > 0.6:
                    duplicates.append({
                        "id1": str(uc1.id),
                        "title1": uc1.title,
                        "id2": str(uc2.id),
                        "title2": uc2.title,
                        "similarity": int(similarity * 100)
                    })
        
        return sorted(duplicates, key=lambda x: x["similarity"], reverse=True)
    
    async def _calculate_voting_velocity(self, votes: List[Vote]) -> float:
        """Calculate votes per minute (mock implementation)."""
        # In real implementation, would use vote timestamps
        # For now, return mock velocity
        if len(votes) < 5:
            return 1.0
        return 0.8
    
    async def _detect_team_bias(
        self,
        participants: List[Participant],
        votes: List[Vote]
    ) -> Optional[Dict[str, Any]]:
        """Detect if a team is voting consistently high or low."""
        # Mock implementation - would need team assignments in real version
        return None
    
    async def _analyze_quadrants(
        self,
        use_cases: List[UseCase],
        votes: List[Vote]
    ) -> Dict[str, Any]:
        """Analyze use case distribution across value/feasibility quadrants."""
        scored = await self._calculate_scores(use_cases, votes)
        
        quick_wins = []
        strategic_bets = []
        time_sinks = []
        low_priority = []
        
        for uc in scored:
            value = uc.get("value_score", 5)
            feasibility = uc.get("feasibility_score", 5)
            
            if value >= 6 and feasibility >= 6:
                quick_wins.append(uc)
            elif value >= 6 and feasibility < 6:
                strategic_bets.append(uc)
            elif value < 6 and feasibility >= 6:
                time_sinks.append(uc)
            else:
                low_priority.append(uc)
        
        return {
            "quick_wins_count": len(quick_wins),
            "strategic_bets_count": len(strategic_bets),
            "time_sinks_count": len(time_sinks),
            "low_priority_count": len(low_priority),
            "quick_wins": quick_wins[:5],
            "strategic_bets": strategic_bets[:5]
        }
    
    async def _find_similar_groups(
        self,
        use_cases: List[UseCase]
    ) -> List[Dict[str, Any]]:
        """Find groups of similar use cases."""
        duplicates = await self._check_duplicates(use_cases)
        
        # Group duplicates into clusters
        groups = []
        used_ids = set()
        
        for dup in duplicates:
            if dup["id1"] in used_ids or dup["id2"] in used_ids:
                continue
            
            groups.append({
                "use_cases": [dup["id1"], dup["id2"]],
                "titles": [dup["title1"], dup["title2"]],
                "similarity": dup["similarity"]
            })
            used_ids.add(dup["id1"])
            used_ids.add(dup["id2"])
        
        return groups[:3]  # Return top 3 groups
    
    async def _calculate_scores(
        self,
        use_cases: List[UseCase],
        votes: List[Vote]
    ) -> List[Dict[str, Any]]:
        """Calculate aggregated scores for use cases."""
        results = []
        
        for uc in use_cases:
            uc_votes = [v for v in votes if str(v.use_case_id) == str(uc.id)]
            
            if not uc_votes:
                results.append({
                    "id": str(uc.id),
                    "title": uc.title,
                    "avg_score": 0,
                    "vote_count": 0,
                    "value_score": 5,
                    "feasibility_score": 5
                })
                continue
            
            all_scores = []
            value_scores = []
            feasibility_scores = []
            
            for vote in uc_votes:
                if vote.scores:
                    all_scores.extend(vote.scores.values())
                    # Assume common criteria names
                    for key, val in vote.scores.items():
                        key_lower = key.lower()
                        if "value" in key_lower or "impact" in key_lower:
                            value_scores.append(val)
                        elif "feasibility" in key_lower or "effort" in key_lower:
                            feasibility_scores.append(val)
            
            avg_score = statistics.mean(all_scores) if all_scores else 0
            value_avg = statistics.mean(value_scores) if value_scores else avg_score
            feasibility_avg = statistics.mean(feasibility_scores) if feasibility_scores else avg_score
            
            results.append({
                "id": str(uc.id),
                "title": uc.title,
                "avg_score": round(avg_score, 2),
                "vote_count": len(uc_votes),
                "value_score": round(value_avg, 2),
                "feasibility_score": round(feasibility_avg, 2)
            })
        
        # Sort by average score descending
        return sorted(results, key=lambda x: x["avg_score"], reverse=True)

    # =========================================================================
    # Content Enhancement
    # =========================================================================
    
    async def enhance_content(
        self,
        content: Dict[str, str],
        context: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Enhance use case content with AI suggestions.
        Leverages existing RAG service if available.
        """
        from app.services.rag_service import rag_service
        
        # Use existing RAG service for enhancement
        text = f"{content.get('title', '')} {content.get('description', '')}"
        enhanced = await rag_service.enhance_use_case(text)
        
        # Add quality scoring
        quality_score = self._calculate_quality_score(content)
        
        return {
            "enhanced": enhanced,
            "quality_score": quality_score,
            "improvements_made": [
                "Refined title for clarity",
                "Enhanced description with technical details",
                "Added suggested KPIs"
            ] if not enhanced.get("is_mock") else ["Mock enhancement applied"]
        }
    
    def _calculate_quality_score(self, content: Dict[str, str]) -> Dict[str, float]:
        """Calculate quality metrics for use case content."""
        title = content.get("title", "")
        description = content.get("description", "")
        kpi = content.get("kpi", "")
        
        # Completeness (0-1)
        completeness = sum([
            1 if title else 0,
            1 if len(description) > 50 else 0.5 if description else 0,
            1 if kpi else 0
        ]) / 3
        
        # Clarity - based on description length and structure
        clarity = min(1.0, len(description) / 200) if description else 0
        
        # Technical depth - presence of technical terms
        tech_terms = ["ai", "ml", "machine learning", "automation", "data", "api", "model", "algorithm"]
        tech_count = sum(1 for term in tech_terms if term in description.lower())
        technical_depth = min(1.0, tech_count / 3)
        
        return {
            "completeness": round(completeness, 2),
            "clarity": round(clarity, 2),
            "technical_depth": round(technical_depth, 2),
            "overall": round((completeness + clarity + technical_depth) / 3, 2)
        }


# Singleton instance
copilot_service = CopilotService()
