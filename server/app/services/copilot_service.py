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
from app.models.models import Workshop, Participant, HotspotVote
from app.schemas.copilot import (
    CopilotSuggestion,
    EngagementMetrics,
    WorkshopSummary,
    CopilotRequest
)
from app.core.config import settings

class CopilotService:
    """
    AI Copilot service for workshop facilitation assistance.
    Provides contextual suggestions, engagement monitoring, and summary generation.
    """
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.mock_mode = settings.AI_MOCK_MODE or not self.api_key
        self.llm = None
        
        if not self.mock_mode:
            self._initialize_ai_components()
        else:
            print("CopilotService running in MOCK MODE (No API Key found)")
    
    def _initialize_ai_components(self):
        """Initialize LangChain/OpenAI components."""
        try:
            from langchain_openai import ChatOpenAI
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
        
        # Phase-specific suggestion logic
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
        
        # Always check engagement across all phases
        if not settings or settings.engagement_alerts_enabled:
            engagement_suggestions = await self._check_engagement_status(
                workshop, participants, settings
            )
            suggestions.extend(engagement_suggestions)
        
        return suggestions
    
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
        """Detect voting pattern anomalies."""
        anomalies = []
        
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
        
        # Check for group-level anomalies
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
    
    async def _detect_content_anomalies(
        self,
        use_cases: List[UseCase]
    ) -> List[Dict[str, Any]]:
        """Detect content-related anomalies."""
        anomalies = []
        
        # Check for duplicates
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
            prompt = f"""
            Generate 4 thoughtful discussion questions for this AI use case in a workshop setting:
            
            Title: {use_case.title}
            Description: {use_case.description}
            Proposed Solution: {use_case.proposed_solution or 'Not specified'}
            
            {"High variance in voting detected - include questions to understand different perspectives." if variance_data and variance_data.get('std_dev', 0) > 2 else ""}
            
            Return JSON array with objects containing: category, question, follow_up
            Categories: implementation, stakeholders, data, strategic
            """
            
            response = await self.llm.ainvoke(prompt)
            result = json.loads(response.content)
            return result
        except Exception as e:
            print(f"AI prompt generation failed: {e}")
            return self._get_mock_discussion_prompts(use_case, variance_data)
    
    def _get_mock_discussion_prompts(
        self,
        use_case: UseCase,
        variance_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Return mock discussion prompts."""
        prompts = [
            {
                "category": "implementation",
                "question": "What would be the biggest barrier to implementing this use case?",
                "follow_up": "How might we overcome this barrier?"
            },
            {
                "category": "stakeholders",
                "question": "Who are the key stakeholders for this initiative?",
                "follow_up": "How do we ensure their buy-in?"
            },
            {
                "category": "data",
                "question": "What data would be needed and is it currently available?",
                "follow_up": "What data quality issues might we encounter?"
            },
            {
                "category": "strategic",
                "question": "How does this align with our strategic priorities?",
                "follow_up": "What trade-offs are we making by pursuing this?"
            }
        ]
        
        if variance_data and variance_data.get("std_dev", 0) > 2:
            prompts.insert(0, {
                "category": "alignment",
                "question": "There seems to be disagreement on this use case. What concerns should we address?",
                "follow_up": "What would change your perspective?"
            })
        
        return prompts

    # =========================================================================
    # Summary Generation
    # =========================================================================
    
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
            prompt = f"""
            Generate a {format} summary for this AI prioritization workshop:
            
            Workshop: {workshop.title}
            Participants: {len(participants)}
            Use Cases Submitted: {len(use_cases)}
            
            Top Scored Use Cases:
            {json.dumps(scored_use_cases[:5], indent=2)}
            
            Engagement: {engagement_data['group_metrics']['avg_engagement']}% average
            
            Sections to include: {', '.join(sections)}
            
            Return JSON with keys: executive_summary, key_findings, top_recommendations, next_steps, participant_stats
            """
            
            response = await self.llm.ainvoke(prompt)
            result = json.loads(response.content)
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
